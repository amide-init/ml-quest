/**
 * Seeded dataset generators, train/test split, and pure data transforms.
 * See ARCHITECTURE.md §4 and §5.3.
 */
export { generateLinearMulti } from './LinearMulti'
export { gaussian, generateLinearNoisy } from './LinearNoisy'
export { applyStandardization, fitStandardization } from './Standardize'
export type { Standardization } from './Standardize'
export { generateTwoBlobs } from './TwoBlobs'
export {
  expandFeatures,
  expandPolynomial,
  featureValue,
  polynomialTerms,
  termValue,
} from './Polynomial'
export { generateRings } from './Rings'
export { generateClassification } from './Classification'
