import { useMemo } from 'react'
import type { WorldProgress } from '@/models'
import { useProgressStore } from '@/stores'
import { useServices } from './useServices'

/** Each world with levels and the player's progress through it, kept in step with progress. */
export function useWorldProgress(): readonly WorldProgress[] {
  const { levels } = useServices()
  const progress = useProgressStore((state) => state.progress)
  return useMemo(() => levels.worldProgress(progress), [levels, progress])
}
