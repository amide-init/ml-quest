/**
 * Algorithm (ML model) and optimizer implementations and their registries.
 * See ARCHITECTURE.md §4 and §5.2.
 */
export { createLandscape2D, LANDSCAPE_2D_ID } from './algorithms/Landscape2D'
export { findLandscapeMinimum } from './algorithms/LandscapeMinimum'
export { leastSquares, LINEAR_REGRESSION_ID, linearRegression } from './algorithms/LinearRegression'
export {
  MULTI_LINEAR_REGRESSION_ID,
  multiLinearRegression,
  solveLeastSquares,
} from './algorithms/MultiLinearRegression'
export type { LandscapeMinimum } from './algorithms/LandscapeMinimum'
export { gradientDescentStep } from './optimizers/GradientDescent'
export { trainGradientDescent } from './Train'
export type { TrainOptions, TrainResult } from './Train'
export { LOG_LEARNING_RATES, searchLearningRate } from './Tuning'
export type { LearningRateSearch } from './Tuning'
