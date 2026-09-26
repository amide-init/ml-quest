import type { Progress, StarCount } from '@/models'
import { useProgressStore } from '@/stores'

export interface UseProgress {
  readonly progress: Progress
  readonly bestStars: (levelId: string) => StarCount
}

/** The player's saved progress, for display (map stars, Codex cards). */
export function useProgress(): UseProgress {
  const progress = useProgressStore((state) => state.progress)
  return {
    progress,
    bestStars: (levelId) => (progress.levels[levelId]?.bestStars ?? 0) as StarCount,
  }
}
