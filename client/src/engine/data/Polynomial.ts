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
