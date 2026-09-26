import type { LevelConfig } from '@/models'

/** Loads level configs. Implementations validate every level against levelConfigSchema. */
export interface LevelRepository {
  get(id: string): LevelConfig | null
  list(): readonly LevelConfig[]
}
