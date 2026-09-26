import type { ClassificationData, DatasetSplit, RingsSpec, Rng } from '@/models'
import { gaussian } from './LinearNoisy'

function sample(spec: RingsSpec, perClass: number, rng: Rng): ClassificationData {
  const minority =
    spec.minorityShare === undefined
      ? perClass
      : Math.max(1, Math.round(perClass * spec.minorityShare))
  const count = perClass + minority
  const x1 = new Float64Array(count)
  const x2 = new Float64Array(count)
  const label = new Uint8Array(count)
  for (let i = 0; i < count; i++) {
    // Interleave classes while both have points left (a balanced set is unchanged).
    const cls = i < minority * 2 ? i % 2 : 0
    const radius = Math.abs(
      (cls === 1 ? spec.innerRadius : spec.outerRadius) + spec.spread * gaussian(rng),
    )
    const angle = rng() * 2 * Math.PI
    x1[i] = radius * Math.cos(angle)
    x2[i] = radius * Math.sin(angle)
    label[i] = cls
  }
  return { x1, x2, label }
}

/** Class 1 in a central disc, class 0 in a surrounding ring; train and hidden test. */
export function generateRings(
  spec: RingsSpec,
  rngs: { readonly train: Rng; readonly test: Rng },
): DatasetSplit<ClassificationData> {
  return {
    train: sample(spec, spec.trainPerClass, rngs.train),
    test: sample(spec, spec.testPerClass, rngs.test),
    outlierIndices: [],
  }
}
