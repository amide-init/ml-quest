import type { ClassificationData, DatasetSplit, GridRegionsSpec, Rng } from '@/models'

/** Index of the band a value falls in, given ascending cut positions. */
const band = (value: number, cuts: readonly number[]) => cuts.filter((cut) => value >= cut).length

function sample(spec: GridRegionsSpec, count: number, rng: Rng): ClassificationData {
  const { xMin, xMax, yMin, yMax } = spec.bounds
  const x1 = new Float64Array(count)
  const x2 = new Float64Array(count)
  const label = new Uint8Array(count)
  const rows = spec.cells.length
  for (let i = 0; i < count; i++) {
    const x = xMin + rng() * (xMax - xMin)
    const y = yMin + rng() * (yMax - yMin)
    // Rows are listed from the top, so the lowest y band is the last row.
    const row = spec.cells[rows - 1 - band(y, spec.yCuts)]
    const cls = row?.[band(x, spec.xCuts)] ?? 0
    const flipped = rng() < spec.labelNoise
    x1[i] = x
    x2[i] = y
    label[i] = flipped ? 1 - cls : cls
  }
  return { x1, x2, label }
}

/** Points in axis-aligned class regions, with label noise; train and hidden test. */
export function generateGridRegions(
  spec: GridRegionsSpec,
  rngs: { readonly train: Rng; readonly test: Rng },
): DatasetSplit<ClassificationData> {
  return {
    train: sample(spec, spec.trainCount, rngs.train),
    test: sample(spec, spec.testCount, rngs.test),
    outlierIndices: [],
  }
}
