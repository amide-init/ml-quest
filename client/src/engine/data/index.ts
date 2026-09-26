/**
 * Seeded dataset generators, train/test split, and pure data transforms.
 * See ARCHITECTURE.md §4 and §5.3.
 */
export { generateLinearMulti } from './LinearMulti'
export { gaussian, generateLinearNoisy } from './LinearNoisy'
export { applyStandardization, fitStandardization } from './Standardize'
export type { Standardization } from './Standardize'
