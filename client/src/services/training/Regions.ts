import type { ContourLine, DecisionRegions, RegressionScene } from '@/models'
import { contourLines } from '@/engine'

/** Decision regions are sampled on this grid (columns × rows) over the map. */
const GRID_COLS = 60
const GRID_ROWS = 48

type View = RegressionScene['view']

/** Which class a classifier gives each grid cell (row by row from the top). */
export function sampleRegions(
  view: View,
  score: (x: number, y: number) => number,
): DecisionRegions {
  const { xMin, xMax, yMin, yMax } = view
  const classes: number[] = []
  for (let row = 0; row < GRID_ROWS; row++) {
    const y = yMax - ((row + 0.5) / GRID_ROWS) * (yMax - yMin)
    for (let col = 0; col < GRID_COLS; col++) {
      const x = xMin + ((col + 0.5) / GRID_COLS) * (xMax - xMin)
      classes.push(score(x, y) > 0 ? 1 : 0)
    }
  }
  return { cols: GRID_COLS, rows: GRID_ROWS, classes }
}

/** The border: where the classifier's score is exactly 0 (engine marching squares). */
export function borderOf(view: View, score: (x: number, y: number) => number): ContourLine[] {
  const { xMin, xMax, yMin, yMax } = view
  return contourLines(
    ([x, y]) => score(x, y),
    { min: [xMin, yMin], max: [xMax, yMax], resolution: 80 },
    [0],
  )
}
