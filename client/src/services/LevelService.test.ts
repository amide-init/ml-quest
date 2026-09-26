import { describe, expect, it } from 'vitest'
import type { Progress, StarCount } from '@/models'
import { DEFAULT_PROGRESS } from '@/models'
import { BundledLevelRepository } from '@/repositories/bundled/BundledLevelRepository'
import { InMemoryProgressRepository } from '@/repositories/in-memory/InMemoryProgressRepository'
import { EvaluationService } from './EvaluationService'
import { LevelService, type UnlockPolicy } from './LevelService'
import { ProgressService } from './ProgressService'
import { TrainingService } from './TrainingService'

const service = (unlocks?: UnlockPolicy) =>
  new LevelService(
    new BundledLevelRepository(),
    new TrainingService(new EvaluationService()),
    new ProgressService(new InMemoryProgressRepository()),
    () => 0,
    unlocks,
  )

const passed = (...ids: string[]): Progress => ({
  levels: Object.fromEntries(ids.map((id) => [id, { bestStars: 1 as StarCount }])),
  concepts: [],
})

describe('LevelService.levelStatuses', () => {
  it('opens only the first level for a new player; the rest wait for the one before', () => {
    const statuses = service().levelStatuses(DEFAULT_PROGRESS)
    expect(statuses['w1-l1']).toEqual({ state: 'open', requires: null, playNext: null })
    expect(statuses['w1-l2']?.state).toBe('locked')
    expect(statuses['w1-l2']?.requires?.id).toBe('w1-l1')
    // Worlds unlock in order: World 2 waits for the World 1 boss...
    expect(statuses['w2-l1']?.requires?.id).toBe('w1-l8')
    // ...and the way forward from anywhere locked is the first level still open.
    expect(statuses['w2-l3']?.playNext?.id).toBe('w1-l1')
  })

  it('opens the next level once one is passed, and marks the passed one completed', () => {
    const statuses = service().levelStatuses(passed('w1-l1'))
    expect(statuses['w1-l1']?.state).toBe('completed')
    expect(statuses['w1-l2']?.state).toBe('open')
    expect(statuses['w1-l3']?.state).toBe('locked')
  })

  it('opens World 2 when the World 1 boss is passed', () => {
    const world1 = Array.from({ length: 8 }, (_, i) => `w1-l${i + 1}`)
    const statuses = service().levelStatuses(passed(...world1))
    expect(statuses['w2-l1']?.state).toBe('open')
    expect(statuses['w2-l2']?.state).toBe('locked')
  })

  it('never re-locks a passed level, even when progress was made out of order', () => {
    const statuses = service().levelStatuses(passed('w1-l1', 'w1-l5'))
    expect(statuses['w1-l3']?.state).toBe('locked')
    expect(statuses['w1-l5']?.state).toBe('completed')
    expect(statuses['w1-l6']?.state).toBe('open')
  })

  it('opens everything under the "all" policy', () => {
    const statuses = Object.values(service('all').levelStatuses(DEFAULT_PROGRESS))
    expect(statuses).toHaveLength(16)
    expect(statuses.every((status) => status.state === 'open')).toBe(true)
  })
})

describe('LevelService.worldProgress', () => {
  it('starts a new player in World 1 with nothing passed', () => {
    const worlds = service().worldProgress(DEFAULT_PROGRESS)
    expect(worlds.map((world) => world.world)).toEqual([1, 2])
    expect(worlds[0]).toEqual({
      world: 1,
      levels: 8,
      passed: 0,
      stars: 0,
      maxStars: 24,
      complete: false,
      current: true,
    })
    expect(worlds[1]?.current).toBe(false)
  })

  it('marks a finished world complete and moves "current" to the next one', () => {
    const world1 = Array.from({ length: 8 }, (_, i) => `w1-l${i + 1}`)
    const worlds = service().worldProgress(passed(...world1, 'w2-l1'))
    expect(worlds[0]).toMatchObject({ complete: true, current: false, passed: 8, stars: 8 })
    expect(worlds[1]).toMatchObject({ complete: false, current: true, passed: 1 })
  })

  it('keeps the last world current once everything is complete', () => {
    const all = [1, 2].flatMap((w) => Array.from({ length: 8 }, (_, i) => `w${w}-l${i + 1}`))
    const worlds = service().worldProgress(passed(...all))
    expect(worlds.map((world) => [world.complete, world.current])).toEqual([
      [true, false],
      [true, true],
    ])
  })
})
