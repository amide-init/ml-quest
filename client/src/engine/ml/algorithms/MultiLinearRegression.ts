import type { Algorithm, TabularData, Vector } from '@/models'
import { assert } from '@/lib'

export const MULTI_LINEAR_REGRESSION_ID = 'multi-linear-regression'

const featureCount = (data: TabularData) => data.columns.length

function predict(params: Vector, data: TabularData, row: number): number {
  const k = featureCount(data)
  let value = params[k] ?? 0 // intercept is the last parameter
  for (let feature = 0; feature < k; feature++) {
    value += (params[feature] ?? 0) * (data.columns[feature]?.[row] ?? 0)
  }
  return value
}

/**
 * ŷ = w₁x₁ + … + wₖxₖ + b with mean squared error. Params are [w₁, …, wₖ, b].
 * The same model as linear regression, with one weight per feature.
 */
export const multiLinearRegression: Algorithm<TabularData> = {
  id: MULTI_LINEAR_REGRESSION_ID,
  paramNames: ['w…', 'b'],

  loss(params, data) {
    assert(
      params.length === featureCount(data) + 1,
      'Expected one weight per feature plus an intercept',
    )
    let sum = 0
    for (let row = 0; row < data.y.length; row++) {
      const residual = predict(params, data, row) - (data.y[row] ?? 0)
      sum += residual * residual
    }
    return sum / data.y.length
  },

  gradient(params, data) {
    const k = featureCount(data)
    const gradient = new Float64Array(k + 1)
    for (let row = 0; row < data.y.length; row++) {
      const residual = predict(params, data, row) - (data.y[row] ?? 0)
      for (let feature = 0; feature < k; feature++) {
        gradient[feature] =
          (gradient[feature] ?? 0) + residual * (data.columns[feature]?.[row] ?? 0)
      }
      gradient[k] = (gradient[k] ?? 0) + residual
    }
    return gradient.map((value) => (2 * value) / data.y.length)
  },

  inDomain: (params) => params.every(Number.isFinite),
}

/**
 * The exact best fit (least squares) via the normal equations, solved with Gaussian elimination
 * and partial pivoting. Used as the "converged" reference, never shown as an answer.
 */
export function solveLeastSquares(data: TabularData): Vector {
  const k = featureCount(data)
  const size = k + 1
  const feature = (row: number, index: number) =>
    index === k ? 1 : (data.columns[index]?.[row] ?? 0)
  // Augmented matrix [XᵀX | Xᵀy].
  const matrix = Array.from({ length: size }, () => new Float64Array(size + 1))
  for (let row = 0; row < data.y.length; row++) {
    for (let i = 0; i < size; i++) {
      const line = matrix[i]
      if (!line) continue
      for (let j = 0; j < size; j++) {
        line[j] = (line[j] ?? 0) + feature(row, i) * feature(row, j)
      }
      line[size] = (line[size] ?? 0) + feature(row, i) * (data.y[row] ?? 0)
    }
  }
  for (let column = 0; column < size; column++) {
    let pivot = column
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(matrix[row]?.[column] ?? 0) > Math.abs(matrix[pivot]?.[column] ?? 0)) pivot = row
    }
    const pivotRow = matrix[pivot]
    const current = matrix[column]
    assert(
      pivotRow && current && Math.abs(pivotRow[column] ?? 0) > 1e-12,
      'Features are linearly dependent',
    )
    matrix[pivot] = current
    matrix[column] = pivotRow
    for (let row = 0; row < size; row++) {
      const target = matrix[row]
      if (row === column || !target) continue
      const factor = (target[column] ?? 0) / (pivotRow[column] ?? 1)
      for (let j = column; j <= size; j++) {
        target[j] = (target[j] ?? 0) - factor * (pivotRow[j] ?? 0)
      }
    }
  }
  return Float64Array.from(
    { length: size },
    (_, i) => (matrix[i]?.[size] ?? 0) / (matrix[i]?.[i] ?? 1),
  )
}
