import { describe, expect, it, vi } from 'vitest'
import { BundledLevelRepository } from './BundledLevelRepository'

describe('BundledLevelRepository', () => {
  it('loads the bundled levels and validates them', () => {
    const repository = new BundledLevelRepository()
    expect(repository.invalid).toEqual([])
    expect(repository.get('w1-l3')?.algorithm.id).toBe('landscape-2d')
  })

  it('never bundles solution files', () => {
    const repository = new BundledLevelRepository()
    expect(repository.list().every((level) => /^w\d-l\d$/.test(level.id))).toBe(true)
    expect(repository.list()).toHaveLength(
      Object.keys(import.meta.glob('/content/levels/*/w*-l[0-9].json')).length,
    )
  })

  it('skips invalid levels instead of failing the whole game', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repository = new BundledLevelRepository({ 'broken.json': { id: 'w1-l1' } })
    expect(repository.get('w1-l1')).toBeNull()
    expect(repository.invalid).toHaveLength(1)
    errorSpy.mockRestore()
  })

  it('returns null for unknown ids', () => {
    expect(new BundledLevelRepository().get('w6-l8')).toBeNull()
  })
})
