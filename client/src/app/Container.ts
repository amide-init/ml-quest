import { getLocalStorage } from '@/platform'
import { InMemorySettingsRepository } from '@/repositories/in-memory/InMemorySettingsRepository'
import { LocalStorageSettingsRepository } from '@/repositories/local-storage/LocalStorageSettingsRepository'
import { SettingsService, type Services } from '@/services'

export interface ContainerOptions {
  /** "browser" uses localStorage when available; "memory" keeps everything in memory (tests). */
  readonly storage: 'browser' | 'memory'
}

/**
 * Composition root (ARCHITECTURE §4.3): the only place that knows concrete repositories.
 * Falls back to in-memory storage when the browser blocks localStorage, so the game still plays.
 */
export function createServices(options: ContainerOptions = { storage: 'browser' }): Services {
  const storage = options.storage === 'browser' ? getLocalStorage() : null

  const settingsRepository = storage
    ? new LocalStorageSettingsRepository(storage, () => Date.now())
    : new InMemorySettingsRepository()

  return {
    settings: new SettingsService(settingsRepository),
  }
}
