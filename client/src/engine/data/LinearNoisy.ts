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

/** Append corrupted points far from the true line; returns the data and the outliers' indices. */
function withOutliers(
  spec: LinearNoisySpec,
  data: RegressionData,
  rng: Rng,
): { readonly data: RegressionData; readonly outlierIndices: readonly number[] } {
  const outliers = spec.outliers
  if (!outliers) {
    return { data, outlierIndices: [] }
  }
  const x = Array.from(data.x)
  const y = Array.from(data.y)
  const outlierIndices: number[] = []
  for (let i = 0; i < outliers.count; i++) {
    const xi = outliers.xMin + rng() * (outliers.xMax - outliers.xMin)
    const jitter = 0.75 + rng() * 0.5
    outlierIndices.push(x.length)
    x.push(xi)
    y.push(spec.slope * xi + spec.intercept + outliers.offset * jitter)
  }
  return { data: { x: Float64Array.from(x), y: Float64Array.from(y) }, outlierIndices }
}

/**
 * Noisy points around a line, split into train and hidden test.
 * Train and test are drawn from the same distribution with independent streams,
 * so the test set measures generalization, not memorization. Outliers, if any, only corrupt train.
 */
export function generateLinearNoisy(
  spec: LinearNoisySpec,
  rngs: { readonly train: Rng; readonly test: Rng },
): DatasetSplit<RegressionData> {
  const clean = sample(spec, spec.trainCount, rngs.train)
  const { data: train, outlierIndices } = withOutliers(spec, clean, rngs.train)
  return { train, test: sample(spec, spec.testCount, rngs.test), outlierIndices }
}
