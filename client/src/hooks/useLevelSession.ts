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

/** The level's model loads on demand, so a session is briefly 'loading' before it is ready. */
type SessionLoad =
  | { readonly status: 'loading' }
  | { readonly status: 'missing' }
  | { readonly status: 'ready'; readonly session: PlaySession }

/**
 * Starts a play session for a level and keeps the component in sync with it.
 * Returns 'loading' while the level's model loads, and null when the level doesn't exist yet.
 * Render with key={levelId} so a new level gets a new session.
 */
export function useLevelSession(levelId: string): UseLevelSession | 'loading' | null {
  const { levels } = useServices()
  const [load, setLoad] = useState<SessionLoad>({ status: 'loading' })
  useEffect(() => {
    let current = true
    void levels.startSession(levelId).then((started) => {
      if (current) setLoad(started ? { status: 'ready', session: started } : { status: 'missing' })
    })
    return () => {
      current = false
    }
  }, [levels, levelId])
  const session = load.status === 'ready' ? load.session : null
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

  if (load.status === 'loading') {
    return 'loading'
  }
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
