import type { Command, EvalResult, LevelConfig, PlayReward, PlayView, SessionEvent } from '@/models'
import { createSession, sessionReducer } from '@/engine'
import type { LevelRunner } from './training/LevelRunner'

type Listener = () => void

/** Called once when an attempt passes; returns what the pass earned (see ProgressService). */
export type OnPassed = (result: EvalResult) => PlayReward

/**
 * One play-through of one level: session reducer + runner. The runner decides when an attempt
 * ends (through the evaluator); this class records it. Exposes an immutable PlayView with
 * subscribe/getView, which is what React's useSyncExternalStore needs.
 */
export class PlaySession {
  readonly #createRunner: () => LevelRunner
  readonly #now: () => number
  readonly #onPassed: OnPassed
  readonly #startedAt: number
  readonly #listeners = new Set<Listener>()
  #runner: LevelRunner
  #view: PlayView

  constructor(
    level: LevelConfig,
    createRunner: () => LevelRunner,
    now: () => number,
    onPassed: OnPassed,
  ) {
    this.#createRunner = createRunner
    this.#now = now
    this.#onPassed = onPassed
    this.#startedAt = now()
    this.#runner = createRunner()
    this.#view = {
      level,
      scene: this.#runner.scene,
      session: createSession(level.id),
      snapshot: this.#runner.snapshot,
      reward: null,
    }
  }

  readonly getView = (): PlayView => this.#view

  readonly subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  start(): void {
    this.#send({ type: 'start', at: this.#elapsed() })
  }

  /** Record and apply a player command, then let the runner judge whether the attempt is over. */
  dispatch(command: Command): void {
    if (this.#view.session.phase !== 'playing') {
      return
    }
    const at = this.#elapsed()
    const session = sessionReducer(this.#view.session, { type: 'command', command, at })
    const snapshot = this.#runner.apply(command)
    this.#set({ session, snapshot })

    const result = this.#runner.judge(command, session)
    if (result) {
      this.#send({ type: 'evaluated', result, at })
      if (result.passed) {
        this.#set({ reward: this.#onPassed(result) })
      }
    }
  }

  retry(): void {
    this.#runner = this.#createRunner()
    this.#set({ snapshot: this.#runner.snapshot, reward: null })
    this.#send({ type: 'retry', at: this.#elapsed() })
  }

  revealHint(): void {
    this.#send({ type: 'reveal-hint', at: this.#elapsed() })
  }

  /** Called periodically by the UI so idle-time hint unlocking can happen. */
  tick(): void {
    this.#send({ type: 'tick', at: this.#elapsed() })
  }

  openDebrief(): void {
    this.#send({ type: 'open-debrief' })
  }

  #elapsed(): number {
    return this.#now() - this.#startedAt
  }

  #send(event: SessionEvent): void {
    const session = sessionReducer(this.#view.session, event)
    if (session !== this.#view.session) {
      this.#set({ session })
    }
  }

  #set(patch: Partial<Pick<PlayView, 'session' | 'snapshot' | 'reward'>>): void {
    this.#view = { ...this.#view, ...patch }
    for (const listener of this.#listeners) {
      listener()
    }
  }
}
