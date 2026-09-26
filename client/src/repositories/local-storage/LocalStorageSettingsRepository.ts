import { z } from 'zod'
import { DEFAULT_SETTINGS, settingsSchema, type Settings } from '@/models'
import type { SettingsRepository } from '@/repositories/SettingsRepository'

export const SETTINGS_STORAGE_KEY = 'mlq:settings'
export const SETTINGS_SCHEMA_VERSION = 1

/** Every persisted blob is wrapped as { v, data } so it can be migrated later (ARCHITECTURE §8.1). */
const envelopeSchema = z.object({ v: z.number().int(), data: z.record(z.string(), z.unknown()) })

export class LocalStorageSettingsRepository implements SettingsRepository {
  readonly persistent = true
  readonly #storage: Storage
  readonly #now: () => number

  constructor(storage: Storage, now: () => number) {
    this.#storage = storage
    this.#now = now
  }

  load(): Settings {
    const raw = this.#storage.getItem(SETTINGS_STORAGE_KEY)
    if (raw === null) {
      return DEFAULT_SETTINGS
    }
    const settings = this.#parse(raw)
    if (settings) {
      return settings
    }
    // Never silently delete player data: keep the unreadable blob next to the fresh defaults.
    this.#storage.setItem(`${SETTINGS_STORAGE_KEY}:corrupt:${this.#now()}`, raw)
    this.#storage.removeItem(SETTINGS_STORAGE_KEY)
    return DEFAULT_SETTINGS
  }

  save(settings: Settings): boolean {
    try {
      this.#storage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ v: SETTINGS_SCHEMA_VERSION, data: settings }),
      )
      return true
    } catch {
      return false
    }
  }

  #parse(raw: string): Settings | null {
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      return null
    }
    const envelope = envelopeSchema.safeParse(json)
    if (!envelope.success || envelope.data.v !== SETTINGS_SCHEMA_VERSION) {
      return null
    }
    // Fill fields added in later releases with defaults instead of discarding the player's choices.
    const settings = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...envelope.data.data })
    return settings.success ? settings.data : null
  }
}
