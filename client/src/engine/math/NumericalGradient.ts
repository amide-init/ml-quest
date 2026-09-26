import type { Vector } from '@/models'
import { component } from './Vector'

/**
 * Central-difference gradient of f at params. Used to verify every algorithm's analytic
 * gradient (RULES.md §5 "gradient check"), not in training.
 */
export function numericalGradient(f: (params: Vector) => number, params: Vector, h = 1e-5): Vector {
  const gradient = new Float64Array(params.length)
  for (let i = 0; i < params.length; i++) {
    const plus = params.slice()
    const minus = params.slice()
    plus[i] = component(params, i) + h
    minus[i] = component(params, i) - h
    gradient[i] = (f(plus) - f(minus)) / (2 * h)
  }
  return gradient
}
