import type { LevelConfig } from '@/models'
import type { LevelRepository } from '@/repositories'
import { PlaySession } from './PlaySession'
import type { ProgressService } from './ProgressService'
import type { TrainingService } from './TrainingService'

/** A level as the map lists it. */
export interface LevelSummary {
  readonly id: string
  readonly world: number
  readonly level: number
  /** Locale key of the title. */
  readonly title: string
}

/**
 * Finds levels and starts play sessions. A passed attempt is recorded in ProgressService
 * (best stars, Codex unlock).
 */
export class LevelService {
  readonly #levels: LevelRepository
  readonly #training: TrainingService
  readonly #progress: ProgressService
  readonly #now: () => number

  constructor(
    levels: LevelRepository,
    training: TrainingService,
    progress: ProgressService,
    now: () => number,
  ) {
    this.#levels = levels
    this.#training = training
    this.#progress = progress
    this.#now = now
  }

  getLevel(id: string): LevelConfig | null {
    return this.#levels.get(id)
  }

  /** Every playable level, in world/level order. */
  listLevels(): readonly LevelSummary[] {
    return this.#levels
      .list()
      .map(({ id, world, level, text }) => ({ id, world, level, title: text.title }))
      .toSorted((a, b) => a.world - b.world || a.level - b.level)
  }

  /** Starts a fresh session, or returns null when the level doesn't exist (yet). */
  startSession(id: string): PlaySession | null {
    const level = this.#levels.get(id)
    if (!level) {
      return null
    }
    return new PlaySession(
      level,
      () => this.#training.createRunner(level),
      this.#now,
      (result) => this.#progress.recordResult(level.id, result, level.text.concept),
    )
  }
}
