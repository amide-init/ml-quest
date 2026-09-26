import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type ThemePreference } from '@/models'
import { InMemorySettingsRepository } from '@/repositories/in-memory/InMemorySettingsRepository'
import { SettingsService } from './SettingsService'

describe('SettingsService', () => {
  it('starts from what the repository has stored', () => {
    const repository = new InMemorySettingsRepository({ ...DEFAULT_SETTINGS, theme: 'dark' })
    expect(new SettingsService(repository).getSettings().theme).toBe('dark')
  })

  it('applies a patch, stores it, and keeps the other fields', () => {
    const repository = new InMemorySettingsRepository()
    const service = new SettingsService(repository)

    const next = service.update({ soundEnabled: true })

    expect(next).toEqual({ ...DEFAULT_SETTINGS, soundEnabled: true })
    expect(service.getSettings()).toEqual(next)
    expect(repository.load()).toEqual(next)
  })

  it('rejects invalid values and keeps the current settings', () => {
    const service = new SettingsService(new InMemorySettingsRepository())
    expect(() => service.update({ theme: 'neon' as ThemePreference })).toThrow()
    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('reports whether settings survive a reload', () => {
    expect(new SettingsService(new InMemorySettingsRepository()).persistent).toBe(false)
  })
})
