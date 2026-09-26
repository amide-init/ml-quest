import { describe, expect, it } from 'vitest'
import { t } from './Translate'

describe('t', () => {
  it('returns the English string for a key', () => {
    expect(t('nav.map')).toBe('Map')
  })

  it('fills placeholders from params', () => {
    expect(t('level.title', { world: 1, level: 3 })).toBe('Level 1-3')
  })

  it('leaves unknown placeholders untouched', () => {
    expect(t('home.demo.step', { step: 2 })).toBe('Step 2 of {total}')
  })

  it('picks the plural form for the count', () => {
    expect(t('level.result.train.converged.body', { rate: '0.50', epochs: 1 })).toBe(
      'With learning rate 0.50, training converged in 1 epoch.',
    )
    expect(t('level.result.train.converged.body', { rate: '0.50', epochs: 4 })).toBe(
      'With learning rate 0.50, training converged in 4 epochs.',
    )
  })
})
