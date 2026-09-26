import type { DatasetSplit, LinearMultiSpec, Rng, TabularData } from '@/models'
import { assert } from '@/lib'
import { gaussian } from './LinearNoisy'

function sample(spec: LinearMultiSpec, count: number, rng: Rng): TabularData {
  const columns = spec.ranges.map(() => new Float64Array(count))
  const y = new Float64Array(count)
  for (let i = 0; i < count; i++) {
    let target = spec.intercept
    spec.ranges.forEach(([min, max], feature) => {
      const value = min + rng() * (max - min)
      const column = columns[feature]
      if (column) column[i] = value
      target += (spec.weights[feature] ?? 0) * value
    })
    y[i] = target + spec.noise * gaussian(rng)
  }
  return { columns, y }
}

/** Several features with their own ranges (W1-L7 Scale Matters), split into train and hidden test. */
export function generateLinearMulti(
  spec: LinearMultiSpec,
  rngs: { readonly train: Rng; readonly test: Rng },
): DatasetSplit<TabularData> {
  assert(
    spec.weights.length === spec.ranges.length,
    'linear-multi needs one weight per feature range',
  )
  return {
    train: sample(spec, spec.trainCount, rngs.train),
    test: sample(spec, spec.testCount, rngs.test),
    outlierIndices: [],
  }
}
