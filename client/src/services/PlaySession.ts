import type { Command, LandscapeMap, LevelConfig, PlayView, SessionEvent } from '@/models'
import { createSession, sessionReducer } from '@/engine'
import type { EvaluationService } from './EvaluationService'
import type { LandscapeRunner } from './training/LandscapeRunner'

type Listener = () => void

/**
 * One play-through of one level: session reducer + runner + evaluator.
 * Exposes an immutable PlayView with subscribe/getView, which is what React's useSyncExternalStore needs.
 */
export class PlaySession {
  readonly #level: LevelConfig
  readonly #map: LandscapeMap
  readonly #evaluation: EvaluationService
  readonly #createRunner: () => LandscapeRunner
  readonly #now: () => number
  readonly #startedAt: number
  readonly #listeners = new Set<Listener>()
  #runner: LandscapeRunner
  #view: PlayView

  constructor(
    level: LevelConfig,
    map: LandscapeMap,
    createRunner: () => LandscapeRunner,
    evaluation: EvaluationService,
    now: () => number,
  ) {
    this.#level = level
    this.#map = map
    this.#createRunner = createRunner
    this.#evaluation = evaluation
    this.#now = now
    this.#startedAt = now()
    this.#runner = createRunner()
    this.#view = { level, map, session: createSession(level.id), snapshot: this.#runner.snapshot }
  }

  readonly getView = (): PlayView => this.#view

  readonly subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  start(): void {
    this.#send({ type: 'start', at: this.#elapsed() })
  }

  /**
   * Record and apply a player command. After each step the attempt is checked automatically:
   * it ends when the ball reaches the valley, leaves the map, or the step budget runs out.
   */
  dispatch(command: Command): void {
    if (this.#view.session.phase !== 'playing') {
      return
    }
    const at = this.#elapsed()
    const session = sessionReducer(this.#view.session, { type: 'command', command, at })
    const snapshot = this.#runner.apply(command)
    this.#set({ session, snapshot })

    if (command.type === 'step') {
      const result = this.#evaluation.evaluateLandscape(
        this.#level,
        snapshot,
        session,
        this.#map.minimum,
      )
      const outOfSteps = snapshot.steps >= this.#level.controls.stepBudget
      if (result.passed || snapshot.status === 'diverged' || outOfSteps) {
        this.#send({ type: 'evaluated', result, at })
      }
    }
  }

  retry(): void {
    this.#runner = this.#createRunner()
    this.#set({ snapshot: this.#runner.snapshot })
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

  #set(patch: Partial<Pick<PlayView, 'session' | 'snapshot'>>): void {
    this.#view = { ...this.#view, ...patch }
    for (const listener of this.#listeners) {
      listener()
    }
  }
}
