import type { ClassificationData, DatasetSplit, Rng, RingsSpec, TwoBlobsSpec } from '@/models'
import { assertNever } from '@/lib'
import { generateRings } from './Rings'
import { generateTwoBlobs } from './TwoBlobs'

/** Any 2D classification dataset, by generator. */
export function generateClassification(
  spec: TwoBlobsSpec | RingsSpec,
  rngs: { readonly train: Rng; readonly test: Rng },
): DatasetSplit<ClassificationData> {
  switch (spec.generator) {
    case 'two-blobs':
      return generateTwoBlobs(spec, rngs)
    case 'rings':
      return generateRings(spec, rngs)
    default:
      return assertNever(spec)
  }
}
