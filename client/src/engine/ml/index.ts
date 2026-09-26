/**
 * Algorithm (ML model) and optimizer implementations and their registries.
 * See ARCHITECTURE.md §4 and §5.2.
 */
export { createLandscape2D, LANDSCAPE_2D_ID } from './algorithms/Landscape2D'
export { findLandscapeMinimum } from './algorithms/LandscapeMinimum'
export type { LandscapeMinimum } from './algorithms/LandscapeMinimum'
export { gradientDescentStep } from './optimizers/GradientDescent'
