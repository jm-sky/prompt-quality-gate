import { expect, test } from 'claude-code/testing'

import {
  isExactSkip,
  isFirstPrompt,
  LABELS,
  parseAssessment,
  questionOptions,
  resolveConfig,
  skipReason,
} from './logic'
import type { PromptEvent } from './logic'

const typed = (text: string): PromptEvent => ({ text, origin: { kind: 'composer' } })

test('config: project > user > default, bad values ignored', async () => {
  const c = resolveConfig({ model: 'sonnet', maxQuestions: 2, skipExact: 'a, b' }, { maxQuestions: 9, timeoutMs: 'x', enabled: false })
  expect(c.model).toBe('sonnet')
  expect(c.maxQuestions).toBe(3)
  expect(c.timeoutMs).toBe(20_000)
  expect(c.enabled).toBe(false)
  expect(c.skipExact).toEqual(['a', 'b'])
  expect(resolveConfig(undefined, 'junk').model).toBe('haiku')
})

test('skipReason: only typed prompts are eligible', async () => {
  expect(skipReason(typed('Zrób coś'))).toBe(undefined)
  expect(skipReason({ text: 'x', origin: { kind: 'plugin' } })).toBe('not-composer')
  expect(skipReason({ ...typed('/clear'), command: {} })).toBe('slash-command')
  expect(skipReason({ ...typed('x'), isMeta: true })).toBe('meta')
  expect(skipReason({ ...typed('x'), attachments: [{}] })).toBe('attachments')
  expect(skipReason(typed('zobacz @NOTE.md'))).toBe('file-mention')
  expect(skipReason(typed('  '))).toBe('empty')
  expect(skipReason(typed('mail me at a@b.c'))).toBe(undefined)
})

test('isExactSkip: trimmed and case-insensitive', async () => {
  expect(isExactSkip('  Continue ', ['continue'])).toBe(true)
  expect(isExactSkip('continue now', ['continue'])).toBe(false)
})

test('isFirstPrompt: local command rows do not count, history does', async () => {
  expect(isFirstPrompt([])).toBe(true)
  expect(isFirstPrompt([{ role: 'user', text: '<command-name>/clear</command-name>' }])).toBe(true)
  expect(isFirstPrompt([{ role: 'user', text: '<local-command-stdout>ok</local-command-stdout>' }])).toBe(true)
  expect(isFirstPrompt([{ role: 'user', text: 'hello' }])).toBe(false)
  expect(isFirstPrompt([{ role: 'assistant', text: 'hi' }])).toBe(false)
})

test('parseAssessment: pass, clarify, caps, junk', async () => {
  expect(parseAssessment('{"verdict":"pass"}', 3)).toEqual({ verdict: 'pass' })
  const q = (n: number) => ({ question: `Q${n}?`, header: `H${n}`, options: ['a', 'b', 'c'] })
  const a = parseAssessment('```json\n' + JSON.stringify({ verdict: 'clarify', questions: [q(1), q(2), q(3), q(4)] }) + '\n```', 2)
  expect(a.verdict).toBe('clarify')
  if (a.verdict === 'clarify') expect(a.questions.length).toBe(2)
  expect(parseAssessment('{"verdict":"clarify","questions":[]}', 3)).toEqual({ verdict: 'pass' })
  expect(() => parseAssessment('nope', 3)).toThrow()
  expect(() => parseAssessment('{"verdict":"x"}', 3)).toThrow()
})

test('questionOptions: at most 2 suggestions + decide + skip', async () => {
  const o = questionOptions({ question: 'q', header: 'h', options: ['a', 'b', 'c', LABELS.skip] })
  expect(o).toEqual(['a', 'b', LABELS.decide, LABELS.skip])
})
