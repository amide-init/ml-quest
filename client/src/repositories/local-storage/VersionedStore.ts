import { z } from 'zod'

export interface VersionedStoreOptions<T> {
  readonly storage: Storage
  /** localStorage key, e.g. "mlq:progress". */
  readonly key: string
  /** Bump when the stored shape changes, and add a migration (ARCHITECTURE §8.1). */
  readonly version: number
  readonly schema: z.ZodType<T>
  readonly defaults: T
  /** Timestamp source for corrupt-data backup keys. Injected so tests are deterministic. */
  readonly now: () => number
}

/** Every persisted blob is wrapped as { v, data } so it can be migrated later. */
const envelopeSchema = z.object({ v: z.number().int(), data: z.record(z.string(), z.unknown()) })

/**
 * One versioned JSON document in localStorage, shared by every local-storage repository.
 * - Missing fields (saved by an older release) are filled from defaults.
 * - Unreadable data is backed up under "<key>:corrupt:<time>" before resetting (RULES.md §7:
 *   never silently delete player data).
 * - Write failures (quota, privacy mode) are reported, not thrown.
 */
export class VersionedStore<T extends object> {
  readonly #options: VersionedStoreOptions<T>

  constructor(options: VersionedStoreOptions<T>) {
    this.#options = options
  }

  load(): T {
    const { storage, key, defaults, now } = this.#options
    const raw = storage.getItem(key)
    if (raw === null) {
      return defaults
    }
    const value = this.#parse(raw)
    if (value) {
      return value
    }
    storage.setItem(`${key}:corrupt:${now()}`, raw)
    storage.removeItem(key)
    return defaults
  }

  save(value: T): boolean {
    const { storage, key, version } = this.#options
    try {
      storage.setItem(key, JSON.stringify({ v: version, data: value }))
      return true
    } catch {
      return false
    }
  }

  #parse(raw: string): T | null {
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      return null
    }
    const envelope = envelopeSchema.safeParse(json)
    if (!envelope.success || envelope.data.v !== this.#options.version) {
      return null
    }
    const parsed = this.#options.schema.safeParse({
      ...this.#options.defaults,
      ...envelope.data.data,
    })
    return parsed.success ? parsed.data : null
  }
}
