import { useMemo } from 'react'
import type { LevelSummary } from '@/services'
import { useServices } from './useServices'

/** Every playable level, in order (for the world map). */
export function useLevelCatalog(): readonly LevelSummary[] {
  const { levels } = useServices()
  return useMemo(() => levels.listLevels(), [levels])
}
