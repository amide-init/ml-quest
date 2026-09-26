import type { Settings } from '@/models'

/** Reads and writes player settings. Implementations live in source subfolders. */
export interface SettingsRepository {
  /** False when settings only live in memory (for example, storage is blocked). */
  readonly persistent: boolean
  /** Returns stored settings, or defaults when nothing valid is stored. Never throws. */
  load(): Settings
  /** Stores settings. Returns false if the write failed (for example, quota exceeded). */
  save(settings: Settings): boolean
}
