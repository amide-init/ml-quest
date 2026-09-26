import { DEFAULT_PROGRESS, type Progress } from '@/models'
import type { ProgressRepository } from '@/repositories/ProgressRepository'

/** Keeps progress for the current page only. Used in tests and when browser storage is blocked. */
export class InMemoryProgressRepository implements ProgressRepository {
  readonly persistent = false
  #progress: Progress

  constructor(initial: Progress = DEFAULT_PROGRESS) {
    this.#progress = initial
  }

  load(): Progress {
    return this.#progress
  }

  save(progress: Progress): boolean {
    this.#progress = progress
    return true
  }
}
