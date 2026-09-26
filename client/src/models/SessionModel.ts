import type { Command } from './CommandModel'
import type { EvalResult } from './EvalResultModel'

/** Level lifecycle (ARCHITECTURE §5.6). */
export type SessionPhase = 'briefing' | 'playing' | 'passed' | 'failed' | 'debrief'

export interface TracedCommand {
  readonly command: Command
  /** Milliseconds since the session started (injected clock, never Date.now() in the engine). */
  readonly at: number
}

export interface SessionState {
  readonly levelId: string
  readonly phase: SessionPhase
  /** 1 for the first try, +1 on every retry. */
  readonly attempt: number
  /** Commands in the current attempt, for metrics and replay. */
  readonly trace: readonly TracedCommand[]
  /** Hints become available after a failed attempt or HINT_IDLE_MS without any action. */
  readonly hintsUnlocked: boolean
  /** How many hint tiers the player has opened (0–3). Any opened hint caps stars at 2. */
  readonly hintsRevealed: number
  readonly lastActivityAt: number
  readonly lastResult: EvalResult | null
}

export type SessionEvent =
  | { readonly type: 'start'; readonly at: number }
  | { readonly type: 'command'; readonly command: Command; readonly at: number }
  | { readonly type: 'evaluated'; readonly result: EvalResult; readonly at: number }
  | { readonly type: 'retry'; readonly at: number }
  | { readonly type: 'reveal-hint'; readonly at: number }
  | { readonly type: 'tick'; readonly at: number }
  | { readonly type: 'open-debrief' }
