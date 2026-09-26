import type { ClassificationData, DatasetSplit, Rng, TwoBlobsSpec } from '@/models'
import { gaussian } from './LinearNoisy'

function sample(spec: TwoBlobsSpec, perClass: number, rng: Rng): ClassificationData {
  const minority =
    spec.minorityShare === undefined
      ? perClass
      : Math.max(1, Math.round(perClass * spec.minorityShare))
  const count = perClass + minority
  const x1 = new Float64Array(count)
  const x2 = new Float64Array(count)
  const label = new Uint8Array(count)
  for (let i = 0; i < count; i++) {
    // Interleave classes while both have points left (a balanced set stays balanced in any prefix).
    const cls = i < minority * 2 ? i % 2 : 0
    const [cx, cy] = spec.centers[cls] ?? [0, 0]
    x1[i] = cx + spec.spread * gaussian(rng)
    x2[i] = cy + spec.spread * gaussian(rng)
    label[i] = cls
  }
  return { x1, x2, label }
}

/** Two Gaussian clusters, one per class, split into train and hidden test from independent streams. */
export function generateTwoBlobs(
  spec: TwoBlobsSpec,
  rngs: { readonly train: Rng; readonly test: Rng },
): DatasetSplit<ClassificationData> {
  return {
    train: sample(spec, spec.trainPerClass, rngs.train),
    test: sample(spec, spec.testPerClass, rngs.test),
    outlierIndices: [],
  }
}
