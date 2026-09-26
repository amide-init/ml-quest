import type { ConceptId, EvalResult, Progress, StarCount } from '@/models'
import type { ProgressRepository } from '@/repositories'

type Listener = () => void

export interface RecordOutcome {
  /** True when this result beat the previous best (or was the first pass). */
  readonly newBest: boolean
  /** The concept card unlocked by this result, if it was new. */
  readonly unlockedConcept: ConceptId | null
}

/**
 * The player's progress: best stars per level and unlocked Codex concepts.
 * Observable (subscribe/getProgress) so app/Bootstrap can mirror it into a store.
 */
export class ProgressService {
  readonly #repository: ProgressRepository
  readonly #listeners = new Set<Listener>()
  #progress: Progress

  constructor(repository: ProgressRepository) {
    this.#repository = repository
    this.#progress = repository.load()
  }

  get persistent(): boolean {
    return this.#repository.persistent
  }

  readonly getProgress = (): Progress => this.#progress

  readonly subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  bestStars(levelId: string): StarCount {
    return (this.#progress.levels[levelId]?.bestStars ?? 0) as StarCount
  }

  /** Replace all progress, e.g. from an imported code (the caller has validated it). */
  replace(progress: Progress): void {
    this.#progress = progress
    this.#repository.save(progress)
    for (const listener of this.#listeners) {
      listener()
    }
  }

  /**
   * Record a finished attempt. Failed attempts change nothing (retries are free, PRD);
   * a pass keeps the best star count and unlocks the level's concept card once.
   */
  recordResult(levelId: string, result: EvalResult, concept: ConceptId): RecordOutcome {
    if (!result.passed) {
      return { newBest: false, unlockedConcept: null }
    }
    const previous = this.bestStars(levelId)
    const newBest = result.stars > previous
    const unlockedConcept = this.#progress.concepts.includes(concept) ? null : concept
    if (!newBest && !unlockedConcept) {
      return { newBest, unlockedConcept }
    }

    this.#progress = {
      levels: newBest
        ? { ...this.#progress.levels, [levelId]: { bestStars: result.stars } }
        : this.#progress.levels,
      concepts: unlockedConcept
        ? [...this.#progress.concepts, unlockedConcept]
        : this.#progress.concepts,
    }
    this.#repository.save(this.#progress)
    for (const listener of this.#listeners) {
      listener()
    }
    return { newBest, unlockedConcept }
  }
}
