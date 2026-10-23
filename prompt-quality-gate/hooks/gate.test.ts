import { expect, test } from 'claude-code/testing'

import { CANCEL_MESSAGE, createGate } from './gate'
import type { AskArgs, CompleteResult, Decision, GateDeps } from './gate'
import { LABELS } from './logic'
import type { PromptEvent, TranscriptRow } from './logic'

const typed = (text: string): PromptEvent => ({ text, origin: { kind: 'composer' } })

const CLARIFY = JSON.stringify({
  verdict: 'clarify',
  questions: [
    { question: 'Który framework?', header: 'Framework', options: ['React', 'Vue'] },
    { question: 'Gdzie?', header: 'Miejsce', options: ['src', 'lib'] },
  ],
})

type Fake = {
  deps: GateDeps
  completes: string[]
  asks: string[]
  logs: string[]
}

type Script = {
  rows?: TranscriptRow[]
  sessionId?: string
  files?: Record<string, string>
  replies?: (CompleteResult | Error)[]
  answers?: (string | Error)[]
}

function fake(s: Script = {}): Fake {
  const replies = [...(s.replies ?? [])]
  const answers = [...(s.answers ?? [])]
  const f: Fake = { completes: [], asks: [], logs: [], deps: undefined as never }
  f.deps = {
    sessionId: async () => s.sessionId ?? 's1',
    messages: async () => s.rows ?? [],
    root: async () => '/proj',
    readText: async path => {
      const v = s.files?.[path]
      if (v === undefined) throw new Error('ENOENT')
      return v
    },
    complete: async r => {
      f.completes.push(r.prompt)
      const next = replies.shift()
      if (!next) throw new Error('no scripted reply')
      if (next instanceof Error) throw next
      return next
    },
    ask: async (q: string, _args: AskArgs) => {
      f.asks.push(q)
      const next = answers.shift()
      if (next === undefined) throw new Error('no answer')
      if (next instanceof Error) throw next
      return next
    },
    status: () => {},
    log: t => f.logs.push(t),
  }
  return f
}

const ok = (text: string): CompleteResult => ({ isAnswered: true, text })

const passed = (d: Decision, reason: string) => expect(d).toEqual({ kind: 'pass', reason })

test('a second prompt, a resumed session and history are not gated', async () => {
  const f = fake({ rows: [{ role: 'assistant', text: 'hi' }] })
  passed(await createGate({}).handle(f.deps, typed('Zrób X')), 'not-first')
  expect(f.completes.length).toBe(0)
})

test('/clear rows still count as first', async () => {
  const f = fake({ rows: [{ role: 'user', text: '<command-name>/clear</command-name>' }], replies: [ok('{"verdict":"pass"}')] })
  passed(await createGate({}).handle(f.deps, typed('Zrób X')), 'sufficient')
  expect(f.completes.length).toBe(1)
})

test('skipped prompts, exact skip and disabled never call the model', async () => {
  const g = createGate({})
  const f = fake()
  passed(await g.handle(f.deps, { text: 'x', origin: { kind: 'plugin' } }), 'skipped')
  passed(await g.handle(f.deps, typed('zobacz @a.md')), 'skipped')
  passed(await g.handle(f.deps, typed(' Continue ')), 'exact-skip')
  passed(await createGate({ enabled: false }).handle(fake().deps, typed('Zrób X')), 'disabled')
  expect(f.completes.length).toBe(0)
})

test('project config overrides user config', async () => {
  const f = fake({ files: { '/proj/.claude/prompt-quality-gate.json': '{"enabled":false}' } })
  passed(await createGate({ enabled: true }).handle(f.deps, typed('Zrób X')), 'disabled')
})

test('invalid project config is ignored with a log line', async () => {
  const f = fake({ files: { '/proj/.claude/prompt-quality-gate.json': '{' }, replies: [ok('{"verdict":"pass"}')] })
  passed(await createGate({}).handle(f.deps, typed('Zrób X')), 'sufficient')
  expect(f.logs.length).toBe(1)
})

test('sufficient prompt: one model call, no rewrite', async () => {
  const f = fake({ replies: [ok('{"verdict":"pass"}')] })
  passed(await createGate({}).handle(f.deps, typed('Dobry prompt')), 'sufficient')
  expect(f.completes.length).toBe(1)
  expect(f.asks.length).toBe(0)
})

test('context files reach the assessment prompt', async () => {
  const f = fake({ files: { '/proj/AGENTS.md': 'RULE-ALPHA' }, replies: [ok('{"verdict":"pass"}')] })
  await createGate({}).handle(f.deps, typed('Zrób X'))
  expect(f.completes[0]).toContain('RULE-ALPHA')
})

test('clarify -> accept the improved prompt', async () => {
  const f = fake({ replies: [ok(CLARIFY), ok('Ulepszony prompt')], answers: ['React', 'src', LABELS.sendImproved] })
  const d = await createGate({}).handle(f.deps, typed('Zrób X'))
  expect(d).toEqual({ kind: 'send', text: 'Ulepszony prompt' })
  expect(f.asks.length).toBe(3)
  expect(f.completes[1]).toContain('React')
})

test('clarify -> send original', async () => {
  const f = fake({ replies: [ok(CLARIFY), ok('Ulepszony')], answers: ['React', 'src', LABELS.sendOriginal] })
  passed(await createGate({}).handle(f.deps, typed('Zrób X')), 'original-chosen')
})

test('clarify -> cancel, Esc and Other all drop', async () => {
  for (const last of [LABELS.cancel, 'coś wpisanego', new Error('esc')]) {
    const f = fake({ replies: [ok(CLARIFY), ok('Ulepszony')], answers: ['React', 'src', last] })
    expect(await createGate({}).handle(f.deps, typed('Zrób X'))).toEqual({ kind: 'drop', reason: CANCEL_MESSAGE })
  }
  const f = fake({ replies: [ok(CLARIFY)], answers: [new Error('esc')] })
  expect((await createGate({}).handle(f.deps, typed('Zrób X'))).kind).toBe('drop')
})

test('all answers skip/decide: original passes, no rewrite call', async () => {
  const f = fake({ replies: [ok(CLARIFY)], answers: [LABELS.skip, LABELS.decide] })
  passed(await createGate({}).handle(f.deps, typed('Zrób X')), 'no-new-information')
  expect(f.completes.length).toBe(1)
})

test('model error, timeout, malformed JSON and empty rewrite fail open', async () => {
  const cases: Script[] = [
    { replies: [new Error('boom')] },
    { replies: [{ isAnswered: false, reason: 'timeout' }] },
    { replies: [ok('not json')] },
    { replies: [ok(CLARIFY), ok('  ')], answers: ['React', 'src'] },
  ]
  for (const c of cases) {
    const f = fake(c)
    passed(await createGate({}).handle(f.deps, typed('Zrób X')), 'error')
    expect(f.logs.length).toBe(1)
    expect(f.logs[0]).not.toContain('Zrób X')
  }
})

test('a cancelled session is not gated again on resubmit (loop guard)', async () => {
  const g = createGate({})
  const f = fake({ replies: [ok(CLARIFY), ok('U')], answers: ['React', 'src', LABELS.cancel] })
  expect((await g.handle(f.deps, typed('Zrób X'))).kind).toBe('drop')
  passed(await g.handle(f.deps, typed('Zrób X')), 'already-decided')
})

test('concurrent submits: only one is gated', async () => {
  const g = createGate({})
  const f = fake({ replies: [ok('{"verdict":"pass"}')] })
  const [a, b] = await Promise.all([g.handle(f.deps, typed('A')), g.handle(f.deps, typed('B'))])
  expect([a, b].filter(d => d.kind === 'pass' && d.reason === 'sufficient').length).toBe(1)
  expect(f.completes.length).toBe(1)
})

test('another session is gated independently', async () => {
  const g = createGate({})
  passed(await g.handle(fake({ replies: [ok('{"verdict":"pass"}')] }).deps, typed('A')), 'sufficient')
  passed(await g.handle(fake({ sessionId: 's2', replies: [ok('{"verdict":"pass"}')] }).deps, typed('A')), 'sufficient')
})
