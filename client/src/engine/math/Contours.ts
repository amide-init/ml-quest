import type { ContourLine, Point } from '@/models'

export interface ContourGrid {
  readonly min: Point
  readonly max: Point
  /** Cells per axis. Higher = smoother lines, more work. */
  readonly resolution: number
}

type Segment = readonly [Point, Point]

const keyOf = ([x, y]: Point) => `${x.toFixed(6)},${y.toFixed(6)}`

function interpolate(a: Point, b: Point, va: number, vb: number, level: number): Point {
  const t = vb === va ? 0.5 : (level - va) / (vb - va)
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
}

/** Marching squares: line segments where f crosses `level`, cell by cell. */
function segmentsAt(values: number[][], xs: number[], ys: number[], level: number): Segment[] {
  const segments: Segment[] = []
  for (let j = 0; j < ys.length - 1; j++) {
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[i] ?? 0
      const x1 = xs[i + 1] ?? 0
      const y0 = ys[j] ?? 0
      const y1 = ys[j + 1] ?? 0
      const corners: Point[] = [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ]
      const v = [
        values[j]?.[i] ?? 0,
        values[j]?.[i + 1] ?? 0,
        values[j + 1]?.[i + 1] ?? 0,
        values[j + 1]?.[i] ?? 0,
      ]
      const crossings: Point[] = []
      for (let k = 0; k < 4; k++) {
        const a = k
        const b = (k + 1) % 4
        const va = v[a] ?? 0
        const vb = v[b] ?? 0
        if (va < level !== vb < level) {
          crossings.push(interpolate(corners[a] ?? [0, 0], corners[b] ?? [0, 0], va, vb, level))
        }
      }
      const [p0, p1, p2, p3] = crossings
      if (p0 && p1) segments.push([p0, p1])
      if (p2 && p3) segments.push([p2, p3])
    }
  }
  return segments
}

/** Join touching segments into polylines. */
function joinSegments(segments: Segment[]): { points: Point[]; closed: boolean }[] {
  const byEndpoint = new Map<string, number[]>()
  segments.forEach(([a, b], index) => {
    for (const point of [a, b]) {
      const key = keyOf(point)
      byEndpoint.set(key, [...(byEndpoint.get(key) ?? []), index])
    }
  })
  const used = new Set<number>()
  const lines: { points: Point[]; closed: boolean }[] = []

  const extend = (line: Point[], atEnd: boolean) => {
    for (;;) {
      const tip = atEnd ? line[line.length - 1] : line[0]
      if (!tip) return
      const next = (byEndpoint.get(keyOf(tip)) ?? []).find((index) => !used.has(index))
      if (next === undefined) return
      used.add(next)
      const [a, b] = segments[next] ?? [tip, tip]
      const other = keyOf(a) === keyOf(tip) ? b : a
      if (atEnd) line.push(other)
      else line.unshift(other)
    }
  }

  segments.forEach(([a, b], index) => {
    if (used.has(index)) return
    used.add(index)
    const line: Point[] = [a, b]
    extend(line, true)
    extend(line, false)
    const first = line[0]
    const last = line[line.length - 1]
    lines.push({ points: line, closed: !!first && !!last && keyOf(first) === keyOf(last) })
  })
  return lines
}

/**
 * Contour lines of f over a rectangular grid, for drawing loss landscapes as maps.
 * Pure and deterministic; the UI only draws the returned points.
 */
export function contourLines(
  f: (point: Point) => number,
  grid: ContourGrid,
  levels: readonly number[],
): ContourLine[] {
  const { min, max, resolution } = grid
  const xs = Array.from(
    { length: resolution + 1 },
    (_, i) => min[0] + ((max[0] - min[0]) * i) / resolution,
  )
  const ys = Array.from(
    { length: resolution + 1 },
    (_, j) => min[1] + ((max[1] - min[1]) * j) / resolution,
  )
  const values = ys.map((y) => xs.map((x) => f([x, y])))

  return levels.flatMap((level, levelIndex) =>
    joinSegments(segmentsAt(values, xs, ys, level))
      .filter((line) => line.points.length > 3)
      .map((line) => ({ levelIndex, points: line.points, closed: line.closed })),
  )
}
