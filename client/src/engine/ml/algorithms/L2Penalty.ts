import type { Algorithm, Vector } from '@/models'

/** Every parameter except the bias (the last one). */
const weightsOf = (params: Vector) => params.subarray(0, params.length - 1)

/**
 * L2 regularization (W2-L5): adds strength/2 · ‖w‖² to an algorithm's loss, pulling the weights
 * toward zero so a flexible model can't bend around every noisy point. The bias (last parameter)
 * is not penalized. Strength 0 returns the algorithm unchanged.
 */
export function withL2Penalty<TData>(
  algorithm: Algorithm<TData>,
  strength: number,
): Algorithm<TData> {
  if (strength === 0) {
    return algorithm
  }
  return {
    ...algorithm,
    id: `${algorithm.id}+l2`,
    loss(params, data) {
      let penalty = 0
      for (const weight of weightsOf(params)) penalty += weight * weight
      return algorithm.loss(params, data) + (strength / 2) * penalty
    },
    gradient(params, data) {
      const gradient = algorithm.gradient(params, data).slice()
      for (let i = 0; i < params.length - 1; i++) {
        gradient[i] = (gradient[i] ?? 0) + strength * (params[i] ?? 0)
      }
      return gradient
    },
  }
}
