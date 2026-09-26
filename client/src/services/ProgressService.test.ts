import { makeMetrics } from '@tests/fakes/Metrics'
import { describe, expect, it, vi } from 'vitest'
import type { EvalResult, StarCount } from '@/models'
import { InMemoryProgressRepository } from '@/repositories/in-memory/InMemoryProgressRepository'
import { ProgressService } from './ProgressService'

const result = (stars: StarCount): EvalResult => ({
  passed: stars > 0,
  stars,
  metrics: makeMetrics({ steps: 5 }),
  failedConditions: [],
  nextStarConditions: [],
  cappedByHints: false,
})

describe('ProgressService', () => {
  it('records a first pass and unlocks the concept once', () => {
    const repository = new InMemoryProgressRepository()
    const service = new ProgressService(repository)

    expect(service.recordResult('w1-l3', result(2), 'gradient-descent')).toEqual({
      newBest: true,
      unlockedConcept: 'gradient-descent',
    })
    expect(service.getProgress()).toEqual({
      levels: { 'w1-l3': { bestStars: 2 } },
      concepts: ['gradient-descent'],
    })
    expect(repository.load()).toEqual(service.getProgress())
  })

  it('keeps the best stars: a worse replay never lowers them', () => {
    const service = new ProgressService(new InMemoryProgressRepository())
    service.recordResult('w1-l3', result(3), 'gradient-descent')
    expect(service.recordResult('w1-l3', result(1), 'gradient-descent')).toEqual({
      newBest: false,
      unlockedConcept: null,
    })
    expect(service.bestStars('w1-l3')).toBe(3)
  })

  it('upgrades stars on a better replay without unlocking the concept again', () => {
    const service = new ProgressService(new InMemoryProgressRepository())
    service.recordResult('w1-l3', result(1), 'gradient-descent')
    expect(service.recordResult('w1-l3', result(3), 'gradient-descent').unlockedConcept).toBeNull()
    expect(service.getProgress().concepts).toEqual(['gradient-descent'])
    expect(service.bestStars('w1-l3')).toBe(3)
  })

  it('ignores failed attempts entirely', () => {
    const repository = new InMemoryProgressRepository()
    const save = vi.spyOn(repository, 'save')
    const service = new ProgressService(repository)
    service.recordResult('w1-l3', result(0), 'gradient-descent')
    expect(service.bestStars('w1-l3')).toBe(0)
    expect(save).not.toHaveBeenCalled()
  })

  it('notifies subscribers only when progress changes', () => {
    const service = new ProgressService(new InMemoryProgressRepository())
    const listener = vi.fn()
    service.subscribe(listener)
    service.recordResult('w1-l3', result(2), 'gradient-descent')
    service.recordResult('w1-l3', result(1), 'gradient-descent')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
