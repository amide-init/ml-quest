import { useEffect, useState } from 'react'

/**
 * Replays `total` frames (e.g. epochs) over about `durationMs`, restarting whenever `source`
 * changes. Time-based (requestAnimationFrame + elapsed time), so throttled or slow frames skip
 * ahead instead of slowing the replay down. With reduced motion it jumps straight to the end.
 */
export function usePlayback(
  source: unknown,
  total: number,
  durationMs: number,
  reducedMotion: boolean,
): number {
  const [state, setState] = useState<{ source: unknown; frame: number }>({ source: null, frame: 0 })
  const frame = reducedMotion ? total : state.source === source ? state.frame : 0

  useEffect(() => {
    if (reducedMotion || source === null || total <= 0) {
      return
    }
    const start = performance.now()
    let handle = 0
    const tick = (now: number) => {
      const next = Math.min(total, Math.floor(((now - start) / durationMs) * total))
      setState((current) =>
        current.source === source && current.frame === next ? current : { source, frame: next },
      )
      if (next < total) {
        handle = requestAnimationFrame(tick)
      }
    }
    handle = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(handle)
  }, [source, total, durationMs, reducedMotion])

  return frame
}
