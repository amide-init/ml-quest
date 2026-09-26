import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Command, PlayView } from '@/models'
import type { PlaySession } from '@/services'
import { useServices } from './useServices'

/** How often the session is ticked so idle-time hints can unlock. */
const TICK_MS = 5_000

export interface UseLevelSession {
  readonly view: PlayView
  readonly start: () => void
  readonly dispatch: (command: Command) => void
  readonly retry: () => void
  readonly revealHint: () => void
  readonly openDebrief: () => void
}

const noopSubscribe = () => () => {}
const nullView = () => null

/**
 * Starts a play session for a level and keeps the component in sync with it.
 * Returns null when the level doesn't exist yet. Render with key={levelId} so a new
 * level gets a new session.
 */
export function useLevelSession(levelId: string): UseLevelSession | null {
  const { levels } = useServices()
  const [session] = useState<PlaySession | null>(() => levels.startSession(levelId))
  const view = useSyncExternalStore(
    session?.subscribe ?? noopSubscribe,
    session?.getView ?? nullView,
  )
  const playing = view?.session.phase === 'playing'

  useEffect(() => {
    if (!session || !playing) {
      return
    }
    const timer = window.setInterval(() => session.tick(), TICK_MS)
    return () => window.clearInterval(timer)
  }, [session, playing])

  if (!session || !view) {
    return null
  }
  return {
    view,
    start: () => session.start(),
    dispatch: (command) => session.dispatch(command),
    retry: () => session.retry(),
    revealHint: () => session.revealHint(),
    openDebrief: () => session.openDebrief(),
  }
}
