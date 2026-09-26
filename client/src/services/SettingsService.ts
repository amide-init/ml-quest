import { settingsSchema, type Settings, type SettingsPatch } from '@/models'
import type { SettingsRepository } from '@/repositories'

/** Reads and changes player settings. The reference example of a service (ARCHITECTURE §4.5). */
export class SettingsService {
  readonly #repository: SettingsRepository
  #current: Settings

  constructor(repository: SettingsRepository) {
    this.#repository = repository
    this.#current = repository.load()
  }

  /** False when settings reset at the end of the session (browser storage unavailable). */
  get persistent(): boolean {
    return this.#repository.persistent
  }

  getSettings(): Settings {
    return this.#current
  }

  /** Applies a validated change and stores it. The new settings apply even if storing fails. */
  update(patch: SettingsPatch): Settings {
    const next = settingsSchema.parse({ ...this.#current, ...patch })
    this.#repository.save(next)
    this.#current = next
    return next
  }
}
