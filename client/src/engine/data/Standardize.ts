import type { TabularData } from '@/models'

export interface Standardization {
  readonly means: readonly number[]
  readonly deviations: readonly number[]
}

/** Per-feature mean and standard deviation, measured on the training data only. */
export function fitStandardization(data: TabularData): Standardization {
  const n = data.y.length
  const means = data.columns.map((column) => column.reduce((sum, value) => sum + value, 0) / n)
  const deviations = data.columns.map((column, feature) => {
    const mean = means[feature] ?? 0
    const variance = column.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n
    // A constant feature has nothing to scale; leave it unscaled instead of dividing by zero.
    return Math.sqrt(variance) || 1
  })
  return { means, deviations }
}

/**
 * Feature scaling (standardization): each feature becomes (x − mean) / deviation, so every
 * feature has mean 0 and spread 1. The target y is left untouched, so losses stay comparable.
 */
export function applyStandardization(data: TabularData, scaling: Standardization): TabularData {
  return {
    columns: data.columns.map((column, feature) => {
      const mean = scaling.means[feature] ?? 0
      const deviation = scaling.deviations[feature] ?? 1
      return column.map((value) => (value - mean) / deviation)
    }),
    y: data.y,
  }
}
