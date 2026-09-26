import { DEFAULT_SETTINGS, settingsSchema, type Settings } from '@/models'
import type { SettingsRepository } from '@/repositories/SettingsRepository'
import { VersionedStore } from './VersionedStore'

export const SETTINGS_STORAGE_KEY = 'mlq:settings'
export const SETTINGS_SCHEMA_VERSION = 1

export class LocalStorageSettingsRepository implements SettingsRepository {
  readonly persistent = true
  readonly #store: VersionedStore<Settings>

  constructor(storage: Storage, now: () => number) {
    this.#store = new VersionedStore({
      storage,
      key: SETTINGS_STORAGE_KEY,
      version: SETTINGS_SCHEMA_VERSION,
      schema: settingsSchema,
      defaults: DEFAULT_SETTINGS,
      now,
    })
  }

  load(): Settings {
    return this.#store.load()
  }

  save(settings: Settings): boolean {
    return this.#store.save(settings)
  }
}
