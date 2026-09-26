import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { t } from '@/i18n'
import type { BoundaryScene, Command, Point } from '@/models'
import styles from './BoundaryPlot.module.css'

const WIDTH = 600
const HEIGHT = 480
const KEY_STEP = 0.1
const KEY_STEP_LARGE = 0.5
/** Keyboard nudges within this window count as one move. */
const KEY_COMMIT_MS = 600

type Handles = readonly [Point, Point]

interface BoundaryPlotProps {
  readonly scene: BoundaryScene
  readonly p: Point
  readonly q: Point
  /** Which side is class 1: false = left of p→q (same convention as the engine). */
  readonly flipped: boolean
  readonly disabled: boolean
  /** Widgets never call services: they emit commands (ARCHITECTURE §3). */
  readonly onCommand: (command: Command) => void
}

const round = (value: number) => Math.round(value * 1000) / 1000

/** Signed side of point r relative to the directed line p→q: > 0 is the left side (class 1). */
const side = (p: Point, q: Point, r: Point) =>
  (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])

/** Sutherland–Hodgman: the part of a convex polygon on one side of the line p→q. */
function clipToSide(polygon: readonly Point[], p: Point, q: Point, keepLeft: boolean): Point[] {
  const inside = (r: Point) => (keepLeft ? side(p, q, r) >= 0 : side(p, q, r) <= 0)
  const output: Point[] = []
  polygon.forEach((current, index) => {
    const previous = polygon[(index + polygon.length - 1) % polygon.length] ?? current
    const a = side(p, q, previous)
    const b = side(p, q, current)
    const crossing = (): Point => {
      const k = a / (a - b)
      return [
        previous[0] + k * (current[0] - previous[0]),
        previous[1] + k * (current[1] - previous[1]),
      ]
    }
    if (inside(current)) {
      if (!inside(previous)) output.push(crossing())
      output.push(current)
    } else if (inside(previous)) {
      output.push(crossing())
    }
  })
  return output
}

/**
 * A 2D map of labelled points with a draggable straight border (W2-L1). The two sides are shaded
 * as each class's territory. Classes differ by shape (circle / square), not only colour.
 */
export function BoundaryPlot({ scene, p, q, flipped, disabled, onCommand }: BoundaryPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const commitTimer = useRef<number | undefined>(undefined)
  const [draft, setDraft] = useState<Handles | null>(null)
  const { xMin, xMax, yMin, yMax } = scene.view
  const handles: Handles = draft ?? [p, q]
  const [hp, hq] = handles

  const sx = (x: number) => ((x - xMin) / (xMax - xMin)) * WIDTH
  const sy = (y: number) => HEIGHT - ((y - yMin) / (yMax - yMin)) * HEIGHT
  const clamp = ([x, y]: Point): Point => [
    Math.min(Math.max(x, xMin), xMax),
    Math.min(Math.max(y, yMin), yMax),
  ]
  const path = (points: readonly Point[]) =>
    points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${sx(x)} ${sy(y)}`).join('') + 'Z'

  useEffect(() => () => window.clearTimeout(commitTimer.current), [])

  const commit = (next: Handles) => {
    window.clearTimeout(commitTimer.current)
    commitTimer.current = undefined
    const [a, b] = next
    onCommand({
      type: 'set-boundary',
      p: [round(a[0]), round(a[1])],
      q: [round(b[0]), round(b[1])],
    })
    setDraft(null)
  }

  const toData = (event: PointerEvent<SVGElement>): Point | null => {
    const matrix = svgRef.current?.getScreenCTM()
    if (!matrix) return null
    const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    return clamp([
      xMin + (pt.x / WIDTH) * (xMax - xMin),
      yMin + ((HEIGHT - pt.y) / HEIGHT) * (yMax - yMin),
    ])
  }
  const withHandle = (index: 0 | 1, point: Point): Handles =>
    index === 0 ? [point, hq] : [hp, point]

  const onPointerDown = (event: PointerEvent<SVGGElement>) => {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (index: 0 | 1) => (event: PointerEvent<SVGGElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const point = toData(event)
    if (point) setDraft(withHandle(index, point))
  }
  const onPointerUp = (event: PointerEvent<SVGGElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (draft) commit(draft)
  }
  const onKeyDown = (index: 0 | 1) => (event: KeyboardEvent<SVGGElement>) => {
    if (disabled) return
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP
    const moves: Record<string, Point> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    const current = handles[index]
    const next = withHandle(index, clamp([current[0] + move[0], current[1] + move[1]]))
    setDraft(next)
    window.clearTimeout(commitTimer.current)
    commitTimer.current = window.setTimeout(() => commit(next), KEY_COMMIT_MS)
  }
  const onBlur = () => {
    if (draft && commitTimer.current !== undefined) commit(draft)
  }

  const rect: Point[] = [
    [xMin, yMin],
    [xMax, yMin],
    [xMax, yMax],
    [xMin, yMax],
  ]
  const degenerate = hp[0] === hq[0] && hp[1] === hq[1]
  // Class 1 is on the left of p→q unless flipped.
  const class1Side = degenerate ? [] : clipToSide(rect, hp, hq, !flipped)
  const class0Side = degenerate ? [] : clipToSide(rect, hp, hq, flipped)
  const reach = (xMax - xMin + yMax - yMin) * 2
  const direction: Point = [hq[0] - hp[0], hq[1] - hp[1]]
  const length = Math.hypot(direction[0], direction[1]) || 1
  const far = (k: number): Point => [
    hp[0] + (direction[0] / length) * k,
    hp[1] + (direction[1] / length) * k,
  ]
  const [lineA, lineB] = [far(-reach), far(reach)]

  return (
    <div>
      <div className={styles['sheet']}>
        <svg
          ref={svgRef}
          className={styles['svg']}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="group"
          aria-label={t('level.boundary.plot', { count: scene.points.length })}
        >
          <defs>
            <clipPath id="boundary-plot-area">
              <rect x={0} y={0} width={WIDTH} height={HEIGHT} />
            </clipPath>
          </defs>
          {class1Side.length > 2 ? (
            <path className={styles['territory1']} d={path(class1Side)} />
          ) : null}
          {class0Side.length > 2 ? (
            <path className={styles['territory0']} d={path(class0Side)} />
          ) : null}
          {[-2, -1, 0, 1, 2].map((v) => (
            <g key={v}>
              <line className={styles['grid']} x1={sx(v)} x2={sx(v)} y1={0} y2={HEIGHT} />
              <line className={styles['grid']} x1={0} x2={WIDTH} y1={sy(v)} y2={sy(v)} />
            </g>
          ))}

          {scene.points.map((point) =>
            point.label === 1 ? (
              <circle
                key={`${point.x},${point.y}`}
                className={styles['class1']}
                cx={sx(point.x)}
                cy={sy(point.y)}
                r={6}
              />
            ) : (
              <rect
                key={`${point.x},${point.y}`}
                className={styles['class0']}
                x={sx(point.x) - 5.5}
                y={sy(point.y) - 5.5}
                width={11}
                height={11}
              />
            ),
          )}

          {degenerate ? null : (
            <line
              className={styles['border']}
              clipPath="url(#boundary-plot-area)"
              x1={sx(lineA[0])}
              y1={sy(lineA[1])}
              x2={sx(lineB[0])}
              y2={sy(lineB[1])}
            />
          )}

          {([0, 1] as const).map((index) => {
            const [x, y] = handles[index]
            return (
              <g
                key={index}
                className={styles['handle']}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={t('level.boundary.handle', {
                  n: index + 1,
                  x: x.toFixed(1),
                  y: y.toFixed(1),
                })}
                aria-disabled={disabled}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove(index)}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown(index)}
                onBlur={onBlur}
              >
                <circle className={styles['handleHit']} cx={sx(x)} cy={sy(y)} r={24} />
                <circle className={styles['handleBody']} cx={sx(x)} cy={sy(y)} r={10} />
              </g>
            )
          })}
        </svg>
      </div>
      <div className={styles['legend']} aria-hidden="true">
        <span className={styles['legendItem']}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            <circle className={styles['class1']} cx="7" cy="7" r="6" />
          </svg>
          {t('level.boundary.class1')}
        </span>
        <span className={styles['legendItem']}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            <rect className={styles['class0']} x="1.5" y="1.5" width="11" height="11" />
          </svg>
          {t('level.boundary.class0')}
        </span>
      </div>
      {disabled ? null : <p className={styles['hint']}>{t('level.boundary.hint')}</p>}
    </div>
  )
}
