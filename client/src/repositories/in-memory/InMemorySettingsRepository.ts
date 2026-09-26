import { DEFAULT_SETTINGS, type Settings } from '@/models'
import type { SettingsRepository } from '@/repositories/SettingsRepository'

/** Keeps settings for the current page only. Used in tests and when browser storage is blocked. */
export class InMemorySettingsRepository implements SettingsRepository {
  readonly persistent = false
  #settings: Settings

  constructor(initial: Settings = DEFAULT_SETTINGS) {
    this.#settings = initial
  }

  load(): Settings {
    return this.#settings
  }

  save(settings: Settings): boolean {
    this.#settings = settings
    return true
  }
}
