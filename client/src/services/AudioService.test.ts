import { describe, expect, it, vi } from 'vitest'
import { InMemorySettingsRepository } from '@/repositories/in-memory/InMemorySettingsRepository'
import { AudioService } from './AudioService'
import { SettingsService } from './SettingsService'

const setup = () => {
  const settings = new SettingsService(new InMemorySettingsRepository())
  const chime = vi.fn()
  return { settings, chime, audio: new AudioService(settings, chime) }
}

describe('AudioService', () => {
  it('stays silent on a pass while sound is off (the default)', () => {
    const { audio, chime } = setup()
    audio.levelPassed()
    expect(chime).not.toHaveBeenCalled()
  })

  it('chimes on a pass once the player turns sound on', () => {
    const { audio, chime, settings } = setup()
    settings.update({ soundEnabled: true })
    audio.levelPassed()
    expect(chime).toHaveBeenCalledOnce()
  })
})
