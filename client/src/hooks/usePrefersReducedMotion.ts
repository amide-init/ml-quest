import { useSyncExternalStore } from 'react'
import { useSettingsStore } from '@/stores'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia(QUERY).matches

/** True when animations should be skipped: the player chose "Reduced", or chose "Match system" and the OS asks for it. */
export function usePrefersReducedMotion(): boolean {
  const motion = useSettingsStore((state) => state.settings.motion)
  const systemPrefersReduced = useSyncExternalStore(subscribe, getSnapshot, () => false)
  return motion === 'reduced' || (motion === 'system' && systemPrefersReduced)
}
