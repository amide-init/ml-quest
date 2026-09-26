import type { Algorithm, TabularData, Vector } from '@/models'
import { sigmoid } from './LogisticRegression'

export const MULTI_LOGISTIC_REGRESSION_ID = 'multi-logistic-regression'

function score(params: Vector, data: TabularData, row: number): number {
  const k = data.columns.length
  let value = params[k] ?? 0 // bias is the last parameter
  for (let feature = 0; feature < k; feature++) {
    value += (params[feature] ?? 0) * (data.columns[feature]?.[row] ?? 0)
  }
  return value
}

/**
 * Logistic regression on any number of features: p(class 1) = sigmoid(w · x + b), cross-entropy
 * loss. The target column holds 0/1 labels. Params are [w₁, …, wₖ, b].
 */
export const multiLogisticRegression: Algorithm<TabularData> = {
  id: MULTI_LOGISTIC_REGRESSION_ID,
  paramNames: ['w…', 'b'],

  loss(params, data) {
    let sum = 0
    const n = data.y.length
    for (let row = 0; row < n; row++) {
      const z = score(params, data, row)
      sum += Math.max(z, 0) + Math.log1p(Math.exp(-Math.abs(z))) - (data.y[row] ?? 0) * z
    }
    return sum / n
  },

  gradient(params, data) {
    const k = data.columns.length
    const gradient = new Float64Array(k + 1)
    const n = data.y.length
    for (let row = 0; row < n; row++) {
      const error = sigmoid(score(params, data, row)) - (data.y[row] ?? 0)
      for (let feature = 0; feature < k; feature++) {
        gradient[feature] = (gradient[feature] ?? 0) + error * (data.columns[feature]?.[row] ?? 0)
      }
      gradient[k] = (gradient[k] ?? 0) + error
    }
    return gradient.map((value) => value / n)
  },

  inDomain: (params) => params.every(Number.isFinite),
}

/** Share of rows whose predicted class (score > 0) matches the 0/1 target. */
export function tabularAccuracy(params: Vector, data: TabularData): number {
  const n = data.y.length
  let correct = 0
  for (let row = 0; row < n; row++) {
    if ((score(params, data, row) > 0 ? 1 : 0) === data.y[row]) correct++
  }
  return n === 0 ? Number.NaN : correct / n
}

/** The raw score of one feature vector (for drawing decision regions). */
export function tabularScore(params: Vector, features: readonly number[]): number {
  const k = features.length
  let value = params[k] ?? 0
  for (let i = 0; i < k; i++) value += (params[i] ?? 0) * (features[i] ?? 0)
  return value
}
