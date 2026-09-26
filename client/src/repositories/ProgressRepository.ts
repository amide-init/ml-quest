import type { Progress } from '@/models'

/** Reads and writes the player's progress. Implementations live in source subfolders. */
export interface ProgressRepository {
  /** False when progress only lives in memory (browser storage blocked). */
  readonly persistent: boolean
  /** Returns stored progress, or empty progress when nothing valid is stored. Never throws. */
  load(): Progress
  /** Returns false if the write failed. */
  save(progress: Progress): boolean
}
