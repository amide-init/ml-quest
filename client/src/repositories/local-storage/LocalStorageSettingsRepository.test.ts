import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from '@/models'
import { FakeStorage } from '@tests/fakes/FakeStorage'
import {
  LocalStorageSettingsRepository,
  SETTINGS_STORAGE_KEY,
} from './LocalStorageSettingsRepository'

const DARK: Settings = { ...DEFAULT_SETTINGS, theme: 'dark', soundEnabled: true }

describe('LocalStorageSettingsRepository', () => {
  let storage: FakeStorage
  let repository: LocalStorageSettingsRepository

  beforeEach(() => {
    storage = new FakeStorage()
    repository = new LocalStorageSettingsRepository(storage, () => 1700)
  })

  it('returns defaults when nothing is stored', () => {
    expect(repository.load()).toEqual(DEFAULT_SETTINGS)
  })

  it('round-trips saved settings in a versioned envelope', () => {
    expect(repository.save(DARK)).toBe(true)
    expect(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? '')).toEqual({ v: 1, data: DARK })
    expect(repository.load()).toEqual(DARK)
  })

  it('fills fields missing from older saves with defaults', () => {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ v: 1, data: { theme: 'light' } }))
    expect(repository.load()).toEqual({ ...DEFAULT_SETTINGS, theme: 'light' })
  })

  it('backs up corrupt data, then falls back to defaults', () => {
    storage.setItem(SETTINGS_STORAGE_KEY, '{not json')
    expect(repository.load()).toEqual(DEFAULT_SETTINGS)
    expect(storage.getItem(`${SETTINGS_STORAGE_KEY}:corrupt:1700`)).toBe('{not json')
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).toBeNull()
  })

  it('backs up data with invalid values or an unknown version', () => {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ v: 1, data: { theme: 'neon' } }))
    expect(repository.load()).toEqual(DEFAULT_SETTINGS)
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ v: 99, data: DARK }))
    expect(repository.load()).toEqual(DEFAULT_SETTINGS)
    expect(storage.keys().filter((key) => key.includes(':corrupt:'))).toHaveLength(1)
  })

  it('reports a failed write instead of throwing', () => {
    storage.failWrites = true
    expect(repository.save(DARK)).toBe(false)
  })
})
