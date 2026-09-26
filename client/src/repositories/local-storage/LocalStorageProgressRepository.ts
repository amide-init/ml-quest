import { DEFAULT_PROGRESS, progressSchema, type Progress } from '@/models'
import type { ProgressRepository } from '@/repositories/ProgressRepository'
import { VersionedStore } from './VersionedStore'

export const PROGRESS_STORAGE_KEY = 'mlq:progress'
export const PROGRESS_SCHEMA_VERSION = 1

export class LocalStorageProgressRepository implements ProgressRepository {
  readonly persistent = true
  readonly #store: VersionedStore<Progress>

  constructor(storage: Storage, now: () => number) {
    this.#store = new VersionedStore({
      storage,
      key: PROGRESS_STORAGE_KEY,
      version: PROGRESS_SCHEMA_VERSION,
      schema: progressSchema,
      defaults: DEFAULT_PROGRESS,
      now,
    })
  }

  load(): Progress {
    return this.#store.load()
  }

  save(progress: Progress): boolean {
    return this.#store.save(progress)
  }
}
