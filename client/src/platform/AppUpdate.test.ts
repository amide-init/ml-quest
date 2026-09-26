import { describe, expect, it, vi } from 'vitest'
import { installUpdate, isUpdateReady, subscribeToUpdates, watchForUpdates } from './AppUpdate'

describe('AppUpdate', () => {
  it('waits for the player: records a downloaded update, then applies it only when asked', async () => {
    let needRefresh: (() => void) | undefined
    const update = vi.fn(() => Promise.resolve())
    watchForUpdates((options) => {
      needRefresh = options.onNeedRefresh
      return update
    })
    const listener = vi.fn()
    subscribeToUpdates(listener)
    expect(isUpdateReady()).toBe(false)

    needRefresh?.()
    expect(isUpdateReady()).toBe(true)
    expect(listener).toHaveBeenCalledOnce()
    expect(update).not.toHaveBeenCalled()

    await installUpdate()
    expect(update).toHaveBeenCalledWith(true)
  })
})
