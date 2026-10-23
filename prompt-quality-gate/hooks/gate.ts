// The gate's flow, with everything outside the module injected as GateDeps,
// so it is tested without a session.

import {
  assessPrompt,
  assessSystem,
  cleanRewrite,
  isExactSkip,
  isFirstPrompt,
  isInformative,
  LABELS,
  parseAssessment,
  PROJECT_CONFIG_PATH,
  questionOptions,
  resolveConfig,
  reviewQuestion,
  REWRITE_SYSTEM,
  rewritePrompt,
  skipReason,
  truncate,
} from './logic'
import type { Answer, ContextSnippet, GateConfig, PromptEvent, TranscriptRow } from './logic'

export type CompleteRequest = { model: string; system: string; prompt: string; maxTokens: number; timeoutMs: number }

export type CompleteResult = { isAnswered: true; text: string } | { isAnswered: false; reason: string }

export type AskArgs = { header: string; options: readonly string[] }

export type GateDeps = {
  sessionId: () => Promise<string>
  messages: () => Promise<readonly TranscriptRow[]>
  root: () => Promise<string>
  readText: (path: string) => Promise<string>
  complete: (request: CompleteRequest) => Promise<CompleteResult>
  ask: (question: string, args: AskArgs) => Promise<string>
  status: (text: string | undefined) => void
  log: (text: string) => void
}

export type PassReason =
  | 'skipped'
  | 'not-first'
  | 'already-decided'
  | 'disabled'
  | 'exact-skip'
  | 'sufficient'
  | 'no-new-information'
  | 'original-chosen'
  | 'error'

export type Decision =
  | { kind: 'pass'; reason: PassReason }
  | { kind: 'send'; text: string }
  | { kind: 'drop'; reason: string }

export const CANCEL_MESSAGE = 'Prompt Quality Gate: anulowano, nic nie wysłano. Tekst wrócił do pola edycji.'

class Cancelled extends Error {}

async function loadProjectConfig(deps: GateDeps, root: string): Promise<unknown> {
  let text: string
  try {
    text = await deps.readText(`${root}/${PROJECT_CONFIG_PATH}`)
  } catch {
    return undefined
  }
  try {
    return JSON.parse(text)
  } catch {
    deps.log(`prompt-quality-gate: ${PROJECT_CONFIG_PATH} is not valid JSON; ignored`)
    return undefined
  }
}

async function loadContext(deps: GateDeps, root: string, config: GateConfig): Promise<ContextSnippet[]> {
  if (config.contextMaxChars === 0) return []
  const snippets: ContextSnippet[] = []
  for (const path of config.contextFiles) {
    try {
      const { text, isTruncated } = truncate(await deps.readText(`${root}/${path}`), config.contextMaxChars)
      snippets.push({ path, text, isTruncated })
    } catch {
      // missing or unreadable: not context
    }
  }
  return snippets
}

async function complete(deps: GateDeps, config: GateConfig, system: string, prompt: string, maxTokens: number): Promise<string> {
  const r = await deps.complete({ model: config.model, system, prompt, maxTokens, timeoutMs: config.timeoutMs })
  if (!r.isAnswered) throw new Error(`model: ${r.reason}`)
  return r.text
}

async function ask(deps: GateDeps, question: string, args: AskArgs): Promise<string> {
  try {
    return await deps.ask(question, args)
  } catch {
    // Dismissed (Esc): the person's own choice, not a failure.
    throw new Cancelled()
  }
}

// One gate per loaded module. `decided` holds the sessions whose first prompt
// was already handled, so a cancelled or concurrent submission is not gated twice.
export function createGate(userOptions: unknown) {
  const decided = new Set<string>()

  async function evaluate(deps: GateDeps, e: PromptEvent, config: GateConfig, root: string): Promise<Decision> {
    deps.status('Prompt Quality Gate: ocena pierwszego promptu…')
    let assessment
    try {
      const context = await loadContext(deps, root, config)
      const reply = await complete(deps, config, assessSystem(config.maxQuestions), assessPrompt(e.text, context), 800)
      assessment = parseAssessment(reply, config.maxQuestions)
    } finally {
      deps.status(undefined)
    }
    if (assessment.verdict === 'pass') return { kind: 'pass', reason: 'sufficient' }

    const answers: Answer[] = []
    for (const q of assessment.questions) {
      const answer = await ask(deps, q.question, { header: q.header, options: questionOptions(q) })
      answers.push({ question: q.question, answer })
    }
    if (!answers.some(a => isInformative(a.answer))) return { kind: 'pass', reason: 'no-new-information' }

    deps.status('Prompt Quality Gate: przygotowuję propozycję…')
    let improved: string
    try {
      improved = cleanRewrite(await complete(deps, config, REWRITE_SYSTEM, rewritePrompt(e.text, answers), 1500))
    } finally {
      deps.status(undefined)
    }
    if (!improved) throw new Error('empty rewrite')

    const choice = await ask(deps, reviewQuestion(improved), {
      header: 'Prompt',
      options: [LABELS.sendImproved, LABELS.sendOriginal, LABELS.cancel],
    })
    if (choice === LABELS.sendImproved) return { kind: 'send', text: improved }
    if (choice === LABELS.sendOriginal) return { kind: 'pass', reason: 'original-chosen' }
    // "Anuluj", or anything typed under "Other": nothing is sent.
    throw new Cancelled()
  }

  async function handle(deps: GateDeps, e: PromptEvent): Promise<Decision> {
    if (skipReason(e) !== undefined) return { kind: 'pass', reason: 'skipped' }

    const sessionId = await deps.sessionId()
    if (decided.has(sessionId)) return { kind: 'pass', reason: 'already-decided' }
    // Claimed before any wait: whatever happens next, this session is gated once.
    decided.add(sessionId)
    if (!isFirstPrompt(await deps.messages())) return { kind: 'pass', reason: 'not-first' }

    try {
      const root = await deps.root()
      const config = resolveConfig(userOptions, await loadProjectConfig(deps, root))
      if (!config.enabled) return { kind: 'pass', reason: 'disabled' }
      if (isExactSkip(e.text, config.skipExact)) return { kind: 'pass', reason: 'exact-skip' }
      return await evaluate(deps, e, config, root)
    } catch (err) {
      if (err instanceof Cancelled) return { kind: 'drop', reason: CANCEL_MESSAGE }
      deps.log(`prompt-quality-gate: ${err instanceof Error ? err.message : 'error'}; wysłano oryginalny prompt`)
      return { kind: 'pass', reason: 'error' }
    }
  }

  return { handle }
}
