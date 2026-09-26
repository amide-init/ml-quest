import type { DatasetSplit, LevelOf, Point, RegressionData } from '@/models'
import {
  createSeededRandom,
  generateLinearNoisy,
  hashSeed,
  leastSquares,
  linearRegression,
  vector,
} from '@/engine'

export interface PreparedRegression {
  readonly split: DatasetSplit<RegressionData>
  /** Best achievable training loss (least squares). */
  readonly optimalLoss: number
  /** Training points for drawing. Never includes the hidden test set. */
  readonly points: readonly Point[]
  readonly loss: (w: number, b: number) => number
  readonly outlierIndices: readonly number[]
}

/** Generates a regression level's seeded train/test split and the reference values both runners need. */
export function prepareRegression(level: LevelOf<'linear-regression'>): PreparedRegression {
  const split = generateLinearNoisy(level.algorithm.dataset, {
    train: createSeededRandom(hashSeed(level.id, level.seed, 'train')),
    test: createSeededRandom(hashSeed(level.id, level.seed, 'test')),
  })
  const loss = (w: number, b: number) => linearRegression.loss(vector(w, b), split.train)
  const best = leastSquares(split.train)
  const { x, y } = split.train
  return {
    split,
    optimalLoss: loss(best.w, best.b),
    points: Array.from(x, (xi, i): Point => [xi, y[i] ?? 0]),
    loss,
    outlierIndices: split.outlierIndices,
  }
}
