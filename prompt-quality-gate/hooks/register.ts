import type { EngineInterface, Register } from 'claude-code'

import { createGate } from './gate'
import type { GateDeps } from './gate'

function depsOf($: EngineInterface): GateDeps {
  return {
    sessionId: () => $.session.id(),
    messages: async () => (await $.session.messages()).map(m => ({ role: m.role, text: m.text })),
    root: () => $.session.root(),
    readText: path => $.fs.read(path),
    complete: async request => {
      const r = await $.model.complete(request)
      return r.isAnswered ? { isAnswered: true, text: r.text } : { isAnswered: false, reason: r.reason }
    },
    ask: (question, args) => $.ui.ask(question, args),
    status: text => $.ui.status(text),
    log: text => $.ui.log(text),
  }
}

export const register: Register = (on, options) => {
  const gate = createGate(options)

  on('prompt.submit', async ($, e, next) => {
    const decision = await gate.handle(depsOf($), e)
    if (decision.kind === 'drop') return { drop: decision.reason }
    if (decision.kind === 'send') return next({ ...e, text: decision.text })
    return next(e)
  }).catch(($, e, next) => next(e)) // fail-open: an unexpected failure sends the original
}
