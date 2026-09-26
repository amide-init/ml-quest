import type { Algorithm, RegressionData, Vector } from '@/models'
import { assert } from '@/lib'
import { vector, xy } from '@/engine/math'

export const LINEAR_REGRESSION_ID = 'linear-regression'

function assertSameLength(data: RegressionData): void {
  assert(
    data.x.length === data.y.length && data.x.length > 0,
    'Regression data needs equal, non-empty x and y',
  )
}

/**
 * ŷ = w · x + b, with mean squared error loss (World 1).
 * Params are [w, b]: the slope and the intercept.
 */
export const linearRegression: Algorithm<RegressionData> = {
  id: LINEAR_REGRESSION_ID,
  paramNames: ['w', 'b'],

  loss(params: Vector, data: RegressionData): number {
    assertSameLength(data)
    const [w, b] = xy(params)
    let sum = 0
    for (let i = 0; i < data.x.length; i++) {
      const residual = w * (data.x[i] ?? 0) + b - (data.y[i] ?? 0)
      sum += residual * residual
    }
    return sum / data.x.length
  },

  gradient(params: Vector, data: RegressionData): Vector {
    assertSameLength(data)
    const [w, b] = xy(params)
    let gw = 0
    let gb = 0
    for (let i = 0; i < data.x.length; i++) {
      const x = data.x[i] ?? 0
      const residual = w * x + b - (data.y[i] ?? 0)
      gw += residual * x
      gb += residual
    }
    const scale = 2 / data.x.length
    return vector(gw * scale, gb * scale)
  },

  // Any finite line is a valid model; divergence shows up as a non-finite loss.
  inDomain: (params: Vector) => params.every(Number.isFinite),
}

/**
 * The best possible line (ordinary least squares, closed form). Used to measure how far a
 * player's line is from optimal ("loss gap"), never shown as an answer.
 */
export function leastSquares(data: RegressionData): { readonly w: number; readonly b: number } {
  assertSameLength(data)
  const n = data.x.length
  const meanX = data.x.reduce((a, v) => a + v, 0) / n
  const meanY = data.y.reduce((a, v) => a + v, 0) / n
  let covariance = 0
  let varianceX = 0
  for (let i = 0; i < n; i++) {
    const dx = (data.x[i] ?? 0) - meanX
    covariance += dx * ((data.y[i] ?? 0) - meanY)
    varianceX += dx * dx
  }
  const w = varianceX === 0 ? 0 : covariance / varianceX
  return { w, b: meanY - w * meanX }
}
