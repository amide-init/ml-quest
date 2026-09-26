import type { Algorithm, LandscapeSpec, Vector } from '@/models'
import { vector, xy } from '@/engine/math'

export const LANDSCAPE_2D_ID = 'landscape-2d'

/**
 * A synthetic loss surface where the parameters ARE the ball's position (x, y).
 * Used by W1-L3 Roll Downhill and W1-L5 Bumpy Terrain to teach descent before real data arrives.
 *
 *   f(p) = (u / rx)² + (v / ry)²                     rotated elliptical valley ("bowl")
 *        − Σ depth · exp(−‖p − c‖² / (2 · width²))   Gaussian wells (local minima)
 *        + a · sin(k · x) · cos(k · y)                 optional ripple
 */
export function createLandscape2D(spec: LandscapeSpec): Algorithm {
  const [cx, cy] = spec.bowl.center
  const [rx, ry] = spec.bowl.radii
  const angle = (spec.bowl.angleDeg * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const [minX, minY] = spec.bounds.min
  const [maxX, maxY] = spec.bounds.max

  /** Rotate (p − center) into the bowl's own axes. */
  const toBowlAxes = (x: number, y: number) => {
    const dx = x - cx
    const dy = y - cy
    return { u: dx * cos + dy * sin, v: -dx * sin + dy * cos }
  }

  return {
    id: LANDSCAPE_2D_ID,
    paramNames: ['x', 'y'],

    loss(params: Vector): number {
      const [x, y] = xy(params)
      const { u, v } = toBowlAxes(x, y)
      let value = (u / rx) ** 2 + (v / ry) ** 2
      for (const well of spec.wells) {
        const [wx, wy] = well.center
        const d2 = (x - wx) ** 2 + (y - wy) ** 2
        value -= well.depth * Math.exp(-d2 / (2 * well.width ** 2))
      }
      if (spec.ripple) {
        const { amplitude, frequency } = spec.ripple
        value += amplitude * Math.sin(frequency * x) * Math.cos(frequency * y)
      }
      return value
    },

    gradient(params: Vector): Vector {
      const [x, y] = xy(params)
      const { u, v } = toBowlAxes(x, y)
      // d/du and d/dv of the bowl, rotated back to (x, y): ∂u/∂x = cos, ∂u/∂y = sin, ∂v/∂x = −sin, ∂v/∂y = cos.
      const du = (2 * u) / rx ** 2
      const dv = (2 * v) / ry ** 2
      let gx = du * cos - dv * sin
      let gy = du * sin + dv * cos
      for (const well of spec.wells) {
        const [wx, wy] = well.center
        const w2 = well.width ** 2
        const g = well.depth * Math.exp(-((x - wx) ** 2 + (y - wy) ** 2) / (2 * w2))
        gx += (g * (x - wx)) / w2
        gy += (g * (y - wy)) / w2
      }
      if (spec.ripple) {
        const { amplitude: a, frequency: k } = spec.ripple
        gx += a * k * Math.cos(k * x) * Math.cos(k * y)
        gy -= a * k * Math.sin(k * x) * Math.sin(k * y)
      }
      return vector(gx, gy)
    },

    inDomain(params: Vector): boolean {
      const [x, y] = xy(params)
      return x >= minX && x <= maxX && y >= minY && y <= maxY
    },
  }
}
