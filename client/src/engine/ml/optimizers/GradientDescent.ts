import type { Algorithm, StepResult, Vector } from '@/models'
import { isFiniteVector, scale, subtract } from '@/engine/math'

/**
 * One gradient-descent step: params ← params − learningRate · ∇loss(params).
 * The math is never clamped. If the step lands off the map or produces NaN/Infinity,
 * the result is marked "diverged" so the game can show it (RULES.md §2).
 */
export function gradientDescentStep<TData>(
  algorithm: Algorithm<TData>,
  params: Vector,
  data: TData,
  learningRate: number,
): StepResult {
  const gradient = algorithm.gradient(params, data)
  const next = subtract(params, scale(gradient, learningRate))
  const loss = algorithm.loss(next, data)
  const diverged = !isFiniteVector(next) || !Number.isFinite(loss) || !algorithm.inDomain(next)
  return { params: next, loss, gradient, status: diverged ? 'diverged' : 'ok' }
}
