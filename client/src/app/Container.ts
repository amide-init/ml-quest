import { getLocalStorage } from '@/platform'
import { BundledLevelRepository } from '@/repositories/bundled/BundledLevelRepository'
import { InMemoryProgressRepository } from '@/repositories/in-memory/InMemoryProgressRepository'
import { InMemorySettingsRepository } from '@/repositories/in-memory/InMemorySettingsRepository'
import { LocalStorageProgressRepository } from '@/repositories/local-storage/LocalStorageProgressRepository'
import { LocalStorageSettingsRepository } from '@/repositories/local-storage/LocalStorageSettingsRepository'
import {
  EvaluationService,
  ExportService,
  LevelService,
  ProgressService,
  SettingsService,
  TrainingService,
  type Services,
  type UnlockPolicy,
} from '@/services'

export interface ContainerOptions {
  /** "browser" uses localStorage when available; "memory" keeps everything in memory (tests). */
  readonly storage: 'browser' | 'memory'
  /** Level unlocking; defaults to the PRD's one-by-one rule. */
  readonly unlocks?: UnlockPolicy
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
  const progressRepository = storage
    ? new LocalStorageProgressRepository(storage, () => Date.now())
    : new InMemoryProgressRepository()

  const progress = new ProgressService(progressRepository)
  return {
    settings: new SettingsService(settingsRepository),
    progress,
    progressCodes: new ExportService(progress),
    levels: new LevelService(
      new BundledLevelRepository(),
      new TrainingService(new EvaluationService()),
      progress,
      () => performance.now(),
      options.unlocks,
    ),
  }
}
