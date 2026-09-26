import type { LevelConfig, LevelStatus, LevelSummary, Progress, WorldProgress } from '@/models'
import type { LevelRepository } from '@/repositories'
import { PlaySession } from './PlaySession'
import type { AudioService } from './AudioService'
import type { ProgressService } from './ProgressService'
import type { TrainingService } from './TrainingService'

/**
 * "sequential": the PRD rule. "all": every level open (tests that jump straight into a level;
 * a possible teacher mode later).
 */
export type UnlockPolicy = 'sequential' | 'all'

/**
 * Finds levels, derives which are unlocked, and starts play sessions. A passed attempt is recorded in ProgressService
 * (best stars, Codex unlock).
 */
export class LevelService {
  readonly #levels: LevelRepository
  readonly #training: TrainingService
  readonly #progress: ProgressService
  readonly #now: () => number
  readonly #unlocks: UnlockPolicy
  readonly #audio: AudioService | null

  constructor(
    levels: LevelRepository,
    training: TrainingService,
    progress: ProgressService,
    now: () => number,
    unlocks: UnlockPolicy = 'sequential',
    audio: AudioService | null = null,
  ) {
    this.#levels = levels
    this.#training = training
    this.#progress = progress
    this.#now = now
    this.#unlocks = unlocks
    this.#audio = audio
  }

  getLevel(id: string): LevelConfig | null {
    return this.#levels.get(id)
  }

  /** Every playable level, in world/level order. */
  listLevels(): readonly LevelSummary[] {
    return this.#levels
      .list()
      .map(({ id, world, level, text }) => ({
        id,
        world,
        level,
        title: text.title,
        concept: text.concept,
      }))
      .toSorted((a, b) => a.world - b.world || a.level - b.level)
  }

  /**
   * PRD: worlds unlock in order and levels inside a world one by one, so in world/level order
   * each level opens once the one before it is passed (World 2 opens with the World 1 boss).
   * A passed level never locks again, even if progress was made out of order.
   */
  levelStatuses(progress: Progress): Readonly<Record<string, LevelStatus>> {
    const statuses: Record<string, LevelStatus> = {}
    let previous: { summary: LevelSummary; passed: boolean } | null = null
    let firstOpen: LevelSummary | null = null
    for (const summary of this.listLevels()) {
      const passed = (progress.levels[summary.id]?.bestStars ?? 0) > 0
      const open = this.#unlocks === 'all' || previous === null || previous.passed
      if (passed) {
        statuses[summary.id] = { state: 'completed', requires: null, playNext: null }
      } else if (open) {
        statuses[summary.id] = { state: 'open', requires: null, playNext: null }
        firstOpen ??= summary
      } else {
        statuses[summary.id] = {
          state: 'locked',
          requires: previous?.summary ?? null,
          playNext: firstOpen,
        }
      }
      previous = { summary, passed }
    }
    return statuses
  }

  /** Each world that has levels, in order, with the player's progress through it (the map). */
  worldProgress(progress: Progress): readonly WorldProgress[] {
    const worlds = new Map<number, { levels: number; passed: number; stars: number }>()
    for (const summary of this.listLevels()) {
      const stars = progress.levels[summary.id]?.bestStars ?? 0
      const world = worlds.get(summary.world) ?? { levels: 0, passed: 0, stars: 0 }
      worlds.set(summary.world, {
        levels: world.levels + 1,
        passed: world.passed + (stars > 0 ? 1 : 0),
        stars: world.stars + stars,
      })
    }
    const entries = [...worlds.entries()].toSorted(([a], [b]) => a - b)
    const firstUnfinished = entries.find(([, world]) => world.passed < world.levels)?.[0]
    const currentWorld = firstUnfinished ?? entries.at(-1)?.[0]
    return entries.map(([world, { levels, passed, stars }]) => ({
      world,
      levels,
      passed,
      stars,
      maxStars: levels * 3,
      complete: passed === levels,
      current: world === currentWorld,
    }))
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
      (result) => {
        this.#audio?.levelPassed()
        return this.#progress.recordResult(level.id, result, level.text.concept)
      },
    )
  }
}
