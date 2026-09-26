import { useMemo } from 'react'
import type { LevelStatus } from '@/models'
import { useProgressStore } from '@/stores'
import { useServices } from './useServices'

/** Locked / open / completed for every level, kept in step with the player's progress. */
export function useLevelStatuses(): Readonly<Record<string, LevelStatus>> {
  const { levels } = useServices()
  const progress = useProgressStore((state) => state.progress)
  return useMemo(() => levels.levelStatuses(progress), [levels, progress])
}
