import type { SessionEvent, SessionState } from '@/models'
import { assertNever } from '@/lib'

/** Hints unlock after this long without any player action (PRD "Hints"). */
export const HINT_IDLE_MS = 60_000
/** Nudge → concept reminder → near-solution. */
export const HINT_TIERS = 3

export function createSession(levelId: string): SessionState {
  return {
    levelId,
    phase: 'briefing',
    attempt: 1,
    trace: [],
    hintsUnlocked: false,
    hintsRevealed: 0,
    lastActivityAt: 0,
    lastResult: null,
  }
}

/**
 * The level lifecycle as a pure reducer (ARCHITECTURE §5.6):
 *
 *   briefing ─start→ playing ─evaluated→ passed ─open-debrief→ debrief
 *                      ▲          └──────→ failed (hints unlock)
 *                      └──────── retry ◀──────┘ (also from passed, to chase more stars)
 *
 * Events that don't apply to the current phase are ignored (the state is returned unchanged),
 * so a stray click can never corrupt a session. It never evaluates anything itself:
 * the evaluator's result arrives as an "evaluated" event.
 */
export function sessionReducer(state: SessionState, event: SessionEvent): SessionState {
  switch (event.type) {
    case 'start':
      return state.phase === 'briefing'
        ? { ...state, phase: 'playing', lastActivityAt: event.at }
        : state

    case 'command':
      // "reset" moves the ball back but keeps the trace: every step taken this attempt still counts.
      return state.phase === 'playing'
        ? {
            ...state,
            trace: [...state.trace, { command: event.command, at: event.at }],
            lastActivityAt: event.at,
          }
        : state

    case 'evaluated':
      if (state.phase !== 'playing') {
        return state
      }
      return {
        ...state,
        phase: event.result.passed ? 'passed' : 'failed',
        lastResult: event.result,
        hintsUnlocked: state.hintsUnlocked || !event.result.passed,
        lastActivityAt: event.at,
      }

    case 'retry':
      // Retrying is free (PRD). Revealed hints stay revealed, so the 2-star cap still applies.
      return state.phase === 'failed' || state.phase === 'passed'
        ? {
            ...state,
            phase: 'playing',
            attempt: state.attempt + 1,
            trace: [],
            lastResult: null,
            lastActivityAt: event.at,
          }
        : state

    case 'reveal-hint': {
      const canReveal =
        (state.phase === 'playing' || state.phase === 'failed') &&
        state.hintsUnlocked &&
        state.hintsRevealed < HINT_TIERS
      return canReveal
        ? { ...state, hintsRevealed: state.hintsRevealed + 1, lastActivityAt: event.at }
        : state
    }

    case 'tick':
      return state.phase === 'playing' &&
        !state.hintsUnlocked &&
        event.at - state.lastActivityAt >= HINT_IDLE_MS
        ? { ...state, hintsUnlocked: true }
        : state

    case 'open-debrief':
      return state.phase === 'passed' ? { ...state, phase: 'debrief' } : state

    default:
      return assertNever(event)
  }
}
