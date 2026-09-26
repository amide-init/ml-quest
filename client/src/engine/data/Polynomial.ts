import type { ClassificationData, PolynomialFeature, TabularData } from '@/models'

const FEATURE: Readonly<Record<PolynomialFeature, (x1: number, x2: number) => number>> = {
  x1: (x1) => x1,
  x2: (_x1, x2) => x2,
  'x1^2': (x1) => x1 * x1,
  'x2^2': (_x1, x2) => x2 * x2,
  'x1*x2': (x1, x2) => x1 * x2,
}

/** Value of one engineered feature at a point. */
export const featureValue = (feature: PolynomialFeature, x1: number, x2: number) =>
  FEATURE[feature](x1, x2)

/**
 * Feature engineering: turn 2D points into the chosen columns (e.g. x1², x2²), keeping the labels
 * as the target. A linear model on these columns can draw curved boundaries in the original plane.
 */
export function expandFeatures(
  data: ClassificationData,
  features: readonly PolynomialFeature[],
): TabularData {
  return {
    columns: features.map((feature) =>
      data.x1.map((x1, i) => FEATURE[feature](x1, data.x2[i] ?? 0)),
    ),
    y: Float64Array.from(data.label),
  }
}

/** Exponent pairs (a, b) for every term x1ᵃ·x2ᵇ with 1 ≤ a + b ≤ degree, lowest degree first. */
export function polynomialTerms(degree: number): readonly (readonly [number, number])[] {
  const terms: [number, number][] = []
  for (let total = 1; total <= degree; total++) {
    for (let a = total; a >= 0; a--) {
      terms.push([a, total - a])
    }
  }
  return terms
}

/** Value of one polynomial term at a point. */
export const termValue = ([a, b]: readonly [number, number], x1: number, x2: number) =>
  x1 ** a * x2 ** b

/**
 * Every polynomial term up to `degree` as columns: degree 1 is [x1, x2]; degree 2 adds x1², x1·x2,
 * x2²; degree 6 has 27 columns. More terms = a more flexible (and more overfit-prone) model.
 */
export function expandPolynomial(data: ClassificationData, degree: number): TabularData {
  const terms = polynomialTerms(degree)
  return {
    columns: terms.map((term) => data.x1.map((x1, i) => termValue(term, x1, data.x2[i] ?? 0))),
    y: Float64Array.from(data.label),
  }
}
