import type { DatasetSplit, LinearNoisySpec, RegressionData, Rng } from '@/models'

/** Standard normal sample via Box–Muller (uses two uniform draws from the seeded rng). */
export function gaussian(rng: Rng): number {
  const u = 1 - rng() // (0, 1], so log(u) is finite
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function sample(spec: LinearNoisySpec, count: number, rng: Rng): RegressionData {
  const x = new Float64Array(count)
  const y = new Float64Array(count)
  for (let i = 0; i < count; i++) {
    const xi = spec.xMin + rng() * (spec.xMax - spec.xMin)
    x[i] = xi
    y[i] = spec.slope * xi + spec.intercept + spec.noise * gaussian(rng)
  }
  return { x, y }
}

/**
 * Noisy points around a line, split into train and hidden test.
 * Train and test are drawn from the same distribution with independent streams,
 * so the test set measures generalization, not memorization.
 */
export function generateLinearNoisy(
  spec: LinearNoisySpec,
  rngs: { readonly train: Rng; readonly test: Rng },
): DatasetSplit<RegressionData> {
  return {
    train: sample(spec, spec.trainCount, rngs.train),
    test: sample(spec, spec.testCount, rngs.test),
  }
}
