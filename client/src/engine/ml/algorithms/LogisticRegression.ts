import type { Algorithm, ClassificationData, Vector } from '@/models'
export const LOGISTIC_REGRESSION_ID = 'logistic-regression'

/** Squashes any number into a probability between 0 and 1. */
export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))

/** The raw score w₁x₁ + w₂x₂ + b for point i. Positive = class 1 side of the boundary. */
function score(params: Vector, data: ClassificationData, i: number): number {
  const [w1 = 0, w2 = 0, b = 0] = params
  return w1 * (data.x1[i] ?? 0) + w2 * (data.x2[i] ?? 0) + b
}

/**
 * p(class 1) = sigmoid(w₁x₁ + w₂x₂ + b), trained with cross-entropy (log loss). Params are
 * [w₁, w₂, b]; the decision boundary is the line where the score is 0.
 */
export const logisticRegression: Algorithm<ClassificationData> = {
  id: LOGISTIC_REGRESSION_ID,
  paramNames: ['w1', 'w2', 'b'],

  loss(params, data) {
    let sum = 0
    const n = data.label.length
    for (let i = 0; i < n; i++) {
      const z = score(params, data, i)
      // Numerically stable log(1 + e^z) − y·z, the same value as the textbook cross-entropy.
      sum += Math.max(z, 0) + Math.log1p(Math.exp(-Math.abs(z))) - (data.label[i] ?? 0) * z
    }
    return sum / n
  },

  gradient(params, data) {
    let g1 = 0
    let g2 = 0
    let gb = 0
    const n = data.label.length
    for (let i = 0; i < n; i++) {
      const error = sigmoid(score(params, data, i)) - (data.label[i] ?? 0)
      g1 += error * (data.x1[i] ?? 0)
      g2 += error * (data.x2[i] ?? 0)
      gb += error
    }
    return Float64Array.of(g1 / n, g2 / n, gb / n)
  },

  inDomain: (params) => params.every(Number.isFinite),
}

/** Share of points whose predicted class (score > 0 → 1) matches the label. */
export function accuracy(params: Vector, data: ClassificationData): number {
  const n = data.label.length
  let correct = 0
  for (let i = 0; i < n; i++) {
    const predicted = score(params, data, i) > 0 ? 1 : 0
    if (predicted === data.label[i]) correct++
  }
  return n === 0 ? Number.NaN : correct / n
}

/**
 * The boundary line through points p and q, as [w₁, w₂, b]. Points to the LEFT of p→q score
 * positive (class 1); `flipped` swaps the sides.
 */
export function boundaryThrough(
  p: readonly [number, number],
  q: readonly [number, number],
  flipped: boolean,
): Vector {
  const [px, py] = p
  const [qx, qy] = q
  // Normal to (q − p), pointing left: (−(qy − py), qx − px).
  const sign = flipped ? -1 : 1
  const w1 = -(qy - py) * sign
  const w2 = (qx - px) * sign
  return Float64Array.of(w1, w2, -(w1 * px + w2 * py))
}
