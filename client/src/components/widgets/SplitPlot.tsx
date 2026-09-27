import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { t } from '@/i18n'
import type { CheckedPoint, Command, PlayerSplit, SplitLeaf, SplitScene } from '@/models'
import styles from './SplitPlot.module.css'

const WIDTH = 600
const HEIGHT = 480
const KEY_STEP = 0.1
const KEY_STEP_LARGE = 0.5

type Bounds = SplitLeaf['bounds']

interface SplitPlotProps {
  readonly scene: SplitScene
  readonly splits: readonly PlayerSplit[]
  readonly leaves: readonly SplitLeaf[]
  /** Hidden points, shown only after a check. */
  readonly checked: readonly CheckedPoint[] | null
  /** The region the next question will split. */
  readonly selected: string | null
  readonly onSelect: (path: string) => void
  readonly disabled: boolean
  /** Widgets never call services: they emit commands (ARCHITECTURE §3). */
  readonly onCommand: (command: Command) => void
}

/** The region each split cuts: the map, narrowed by every question above it. */
function splitBounds(splits: readonly PlayerSplit[], view: Bounds): Map<string, Bounds> {
  const byPath = new Map(splits.map((split) => [split.path, split]))
  const regions = new Map<string, Bounds>()
  const walk = (path: string, bounds: Bounds) => {
    const split = byPath.get(path)
    if (!split) return
    regions.set(path, bounds)
    const { axis, threshold } = split
    walk(path + 'L', axis === 0 ? { ...bounds, xMax: threshold } : { ...bounds, yMax: threshold })
    walk(path + 'R', axis === 0 ? { ...bounds, xMin: threshold } : { ...bounds, yMin: threshold })
  }
  walk('', view)
  return regions
}

const round = (value: number) => Math.round(value * 100) / 100

const featureName = (axis: 0 | 1) => t(axis === 0 ? 'level.tree.x1' : 'level.tree.x2')

/**
 * A hand-built decision tree on the map (World 3): each final region is shaded by the class it
 * predicts, and each question is a straight cut. Pick a region to split next; drag a cut, or focus
 * it and use the arrow keys (Shift for bigger moves), to move it.
 */
export function SplitPlot({
  scene,
  splits,
  leaves,
  checked,
  selected,
  onSelect,
  disabled,
  onCommand,
}: SplitPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draft, setDraft] = useState<{ path: string; threshold: number } | null>(null)
  const { view } = scene
  const sx = (x: number) => ((x - view.xMin) / (view.xMax - view.xMin)) * WIDTH
  const sy = (y: number) => HEIGHT - ((y - view.yMin) / (view.yMax - view.yMin)) * HEIGHT
  const shown = splits.map((split) =>
    draft?.path === split.path ? { ...split, threshold: draft.threshold } : split,
  )
  const regions = splitBounds(shown, view)

  const toData = (event: PointerEvent<SVGElement>, axis: 0 | 1) => {
    const matrix = svgRef.current?.getScreenCTM()
    if (!matrix) return null
    const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    return axis === 0
      ? view.xMin + (pt.x / WIDTH) * (view.xMax - view.xMin)
      : view.yMin + ((HEIGHT - pt.y) / HEIGHT) * (view.yMax - view.yMin)
  }
  const onKeyDown = (split: PlayerSplit) => (event: KeyboardEvent<SVGGElement>) => {
    if (disabled) return
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP
    const delta =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? step
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? -step
          : 0
    if (delta === 0) return
    event.preventDefault()
    onCommand({ type: 'move-split', node: split.path, threshold: round(split.threshold + delta) })
  }

  return (
    <div className={styles['sheet']}>
      <svg
        ref={svgRef}
        className={styles['svg']}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="group"
        aria-label={t('level.splits.plot', { count: scene.points.length, regions: leaves.length })}
      >
        {leaves.map((leaf) => {
          const { xMin, xMax, yMin, yMax } = leaf.bounds
          const isSelected = leaf.path === selected
          return (
            <rect
              key={`r${leaf.path}`}
              className={[
                leaf.prediction === 1 ? styles['region1'] : styles['region0'],
                styles['region'],
                isSelected ? styles['selected'] : '',
              ].join(' ')}
              x={sx(xMin)}
              y={sy(yMax)}
              width={sx(xMax) - sx(xMin)}
              height={sy(yMin) - sy(yMax)}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-pressed={isSelected}
              aria-label={t('level.splits.region', {
                safe: leaf.counts[1],
                poisonous: leaf.counts[0],
                verdict: t(leaf.prediction === 1 ? 'level.tree.class1' : 'level.tree.class0'),
              })}
              onClick={() => (disabled ? undefined : onSelect(leaf.path))}
              onKeyDown={(event) => {
                if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault()
                  onSelect(leaf.path)
                }
              }}
            />
          )
        })}
        {checked?.map((point) => {
          const x = sx(point.x)
          const y = sy(point.y)
          return (
            <g
              key={`c${point.x},${point.y}`}
              className={point.correct ? undefined : styles['wrong']}
            >
              {point.label === 1 ? (
                <circle className={styles['checked1']} cx={x} cy={y} r={4.5} />
              ) : (
                <rect className={styles['checked0']} x={x - 4} y={y - 4} width={8} height={8} />
              )}
              {point.correct ? null : (
                <path
                  className={styles['cross']}
                  d={`M${x - 6} ${y - 6}L${x + 6} ${y + 6}M${x + 6} ${y - 6}L${x - 6} ${y + 6}`}
                />
              )}
            </g>
          )
        })}
        {scene.points.map((point) =>
          point.label === 1 ? (
            <circle
              key={`p${point.x},${point.y}`}
              className={styles['class1']}
              cx={sx(point.x)}
              cy={sy(point.y)}
              r={6}
            />
          ) : (
            <rect
              key={`p${point.x},${point.y}`}
              className={styles['class0']}
              x={sx(point.x) - 5.5}
              y={sy(point.y) - 5.5}
              width={11}
              height={11}
            />
          ),
        )}
        {shown.map((split) => {
          const bounds = regions.get(split.path)
          if (!bounds) return null
          const [x1, y1, x2, y2] =
            split.axis === 0
              ? [sx(split.threshold), sy(bounds.yMax), sx(split.threshold), sy(bounds.yMin)]
              : [sx(bounds.xMin), sy(split.threshold), sx(bounds.xMax), sy(split.threshold)]
          const [min, max] =
            split.axis === 0 ? [bounds.xMin, bounds.xMax] : [bounds.yMin, bounds.yMax]
          return (
            <g
              key={`s${split.path}`}
              className={styles['split']}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={t('level.splits.question', { feature: featureName(split.axis) })}
              aria-valuemin={round(min)}
              aria-valuemax={round(max)}
              aria-valuenow={round(split.threshold)}
              aria-valuetext={t('level.splits.value', {
                feature: featureName(split.axis),
                value: split.threshold.toFixed(1),
              })}
              aria-orientation={split.axis === 0 ? 'horizontal' : 'vertical'}
              onKeyDown={onKeyDown(split)}
              onPointerDown={(event) => {
                if (disabled) return
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerMove={(event) => {
                if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return
                const value = toData(event, split.axis)
                if (value !== null) setDraft({ path: split.path, threshold: value })
              }}
              onPointerUp={(event) => {
                if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return
                event.currentTarget.releasePointerCapture(event.pointerId)
                if (draft) {
                  onCommand({
                    type: 'move-split',
                    node: draft.path,
                    threshold: round(draft.threshold),
                  })
                }
                setDraft(null)
              }}
            >
              <line className={styles['splitHit']} x1={x1} y1={y1} x2={x2} y2={y2} />
              <line className={styles['splitLine']} x1={x1} y1={y1} x2={x2} y2={y2} />
            </g>
          )
        })}
      </svg>
      <p className={styles['axes']}>
        {t('level.splits.axes', { x: t('level.tree.x1'), y: t('level.tree.x2') })}
      </p>
    </div>
  )
}
