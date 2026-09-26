import { describe, expect, it } from 'vitest'
import type { EvalResult, SessionEvent, SessionState } from '@/models'
import { createSession, HINT_IDLE_MS, sessionReducer } from './SessionReducer'

const result = (passed: boolean): EvalResult => ({
  passed,
  stars: passed ? 1 : 0,
  metrics: {
    steps: 5,
    moves: 0,
    final_loss: 0.1,
    test_loss: Number.NaN,
    loss_gap: Number.NaN,
    distance_to_global_min: 0.1,
    hints_used: 0,
  },
  failedConditions: [],
  nextStarConditions: [],
  cappedByHints: false,
})

const run = (events: SessionEvent[], from: SessionState = createSession('w1-l3')) =>
  events.reduce(sessionReducer, from)

const step: SessionEvent = { type: 'command', command: { type: 'step' }, at: 10 }
const playing = () => run([{ type: 'start', at: 0 }])

describe('sessionReducer', () => {
  it('starts in briefing and moves to playing on start', () => {
    expect(createSession('w1-l3')).toMatchObject({ phase: 'briefing', attempt: 1, trace: [] })
    expect(playing().phase).toBe('playing')
  })

  it('records commands with their time while playing', () => {
    const state = run([step, { type: 'command', command: { type: 'reset' }, at: 20 }], playing())
    expect(state.trace).toEqual([
      { command: { type: 'step' }, at: 10 },
      { command: { type: 'reset' }, at: 20 },
    ])
    expect(state.lastActivityAt).toBe(20)
  })

  it('ignores commands outside of playing', () => {
    const briefing = createSession('w1-l3')
    expect(sessionReducer(briefing, step)).toBe(briefing)
    const passed = run([{ type: 'evaluated', result: result(true), at: 30 }], playing())
    expect(sessionReducer(passed, step)).toBe(passed)
  })

  it('moves to passed on a passing result, keeping the result', () => {
    const state = run([step, { type: 'evaluated', result: result(true), at: 30 }], playing())
    expect(state).toMatchObject({ phase: 'passed', hintsUnlocked: false })
    expect(state.lastResult?.passed).toBe(true)
  })

  it('moves to failed on a failing result and unlocks hints', () => {
    const state = run([{ type: 'evaluated', result: result(false), at: 30 }], playing())
    expect(state).toMatchObject({ phase: 'failed', hintsUnlocked: true })
  })

  it('retries for free: new attempt, empty trace, hints kept', () => {
    const state = run(
      [
        step,
        { type: 'evaluated', result: result(false), at: 30 },
        { type: 'reveal-hint', at: 40 },
        { type: 'retry', at: 50 },
      ],
      playing(),
    )
    expect(state).toMatchObject({
      phase: 'playing',
      attempt: 2,
      trace: [],
      lastResult: null,
      hintsUnlocked: true,
      hintsRevealed: 1,
    })
  })

  it('allows retrying a passed level to chase more stars', () => {
    const state = run(
      [
        { type: 'evaluated', result: result(true), at: 30 },
        { type: 'retry', at: 40 },
      ],
      playing(),
    )
    expect(state).toMatchObject({ phase: 'playing', attempt: 2 })
  })

  it('opens the debrief only after passing', () => {
    expect(run([{ type: 'open-debrief' }], playing()).phase).toBe('playing')
    const state = run(
      [{ type: 'evaluated', result: result(true), at: 30 }, { type: 'open-debrief' }],
      playing(),
    )
    expect(state.phase).toBe('debrief')
  })

  describe('hints', () => {
    it('stay locked until a failure or long idle', () => {
      const state = run([{ type: 'reveal-hint', at: 5 }], playing())
      expect(state.hintsRevealed).toBe(0)
    })

    it('unlock after HINT_IDLE_MS without any action, not before', () => {
      const state = run([step], playing())
      expect(sessionReducer(state, { type: 'tick', at: 10 + HINT_IDLE_MS - 1 }).hintsUnlocked).toBe(
        false,
      )
      expect(sessionReducer(state, { type: 'tick', at: 10 + HINT_IDLE_MS }).hintsUnlocked).toBe(
        true,
      )
    })

    it('reveal one tier at a time, up to three', () => {
      const unlocked = run([{ type: 'evaluated', result: result(false), at: 30 }], playing())
      const events: SessionEvent[] = Array.from({ length: 5 }, (_, i) => ({
        type: 'reveal-hint',
        at: 40 + i,
      }))
      expect(run(events, unlocked).hintsRevealed).toBe(3)
    })
  })

  it('never mutates the previous state', () => {
    const before = playing()
    const snapshot = structuredClone(before)
    sessionReducer(before, step)
    expect(before).toEqual(snapshot)
  })
})
