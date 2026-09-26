import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PROGRESS, type Progress } from '@/models'
import { FakeStorage } from '@tests/fakes/FakeStorage'
import {
  LocalStorageProgressRepository,
  PROGRESS_STORAGE_KEY,
} from './LocalStorageProgressRepository'

const PLAYED: Progress = { levels: { 'w1-l3': { bestStars: 2 } }, concepts: ['gradient-descent'] }

describe('LocalStorageProgressRepository', () => {
  let storage: FakeStorage
  let repository: LocalStorageProgressRepository

  beforeEach(() => {
    storage = new FakeStorage()
    repository = new LocalStorageProgressRepository(storage, () => 42)
  })

  it('starts empty', () => {
    expect(repository.load()).toEqual(DEFAULT_PROGRESS)
  })

  it('round-trips progress in a versioned envelope', () => {
    expect(repository.save(PLAYED)).toBe(true)
    expect(JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY) ?? '')).toEqual({ v: 1, data: PLAYED })
    expect(repository.load()).toEqual(PLAYED)
  })

  it('never silently deletes progress: bad data is backed up before resetting', () => {
    storage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ v: 1, data: { levels: { 'w1-l3': { bestStars: 7 } } } }),
    )
    expect(repository.load()).toEqual(DEFAULT_PROGRESS)
    expect(storage.getItem(`${PROGRESS_STORAGE_KEY}:corrupt:42`)).toContain('"bestStars":7')
  })

  it('rejects unknown level ids instead of storing junk', () => {
    storage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ v: 1, data: { levels: { hack: { bestStars: 3 } } } }),
    )
    expect(repository.load()).toEqual(DEFAULT_PROGRESS)
  })
})
