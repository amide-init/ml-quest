import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { t } from '@/i18n'
import type { Command, RegressionScene } from '@/models'
import styles from './LineFitPlot.module.css'

const WIDTH = 600
const HEIGHT = 420
const PAD = { left: 44, right: 16, top: 16, bottom: 32 }
/** Handles sit at 15% and 85% of the x range, so the line is always grabbable at both ends. */
const HANDLE_AT = [0.15, 0.85] as const
const KEY_STEP = 0.5
const KEY_STEP_LARGE = 2
/** Keyboard nudges within this window count as one move (a burst of arrow presses = one decision). */
const KEY_COMMIT_MS = 600

type Ends = readonly [number, number]

interface LineFitPlotProps {
  readonly scene: Pick<RegressionScene, 'points' | 'view'>
  readonly w: number
  readonly b: number
  readonly disabled: boolean
  /** Hide the handles entirely (the optimizer, not the player, moves the line). */
  readonly readOnly?: boolean
  /** Widgets never call services: they emit commands (ARCHITECTURE §3). */
  readonly onCommand: (command: Command) => void
}

const round = (value: number) => Math.round(value * 10_000) / 10_000

/**
 * Scatter plot with a draggable line (W1-L1, W1-L2). The player moves the two end handles;
 * letting go (or a pause after arrow keys) sends one set-params command = one move.
 */
export function LineFitPlot({
  scene,
  w,
  b,
  disabled,
  readOnly = false,
  onCommand,
}: LineFitPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const commitTimer = useRef<number | undefined>(undefined)
  const [draft, setDraft] = useState<Ends | null>(null)
  const { xMin, xMax, yMin, yMax } = scene.view

  const handleX = HANDLE_AT.map((share) => xMin + share * (xMax - xMin)) as unknown as Ends
  const ends: Ends = draft ?? [w * handleX[0] + b, w * handleX[1] + b]
  const slope = (ends[1] - ends[0]) / (handleX[1] - handleX[0])
  const intercept = ends[0] - slope * handleX[0]

  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin)) * (WIDTH - PAD.left - PAD.right)
  const sy = (y: number) =>
    HEIGHT - PAD.bottom - ((y - yMin) / (yMax - yMin)) * (HEIGHT - PAD.top - PAD.bottom)
  const clampY = (y: number) => Math.min(Math.max(y, yMin), yMax)

  useEffect(() => () => window.clearTimeout(commitTimer.current), [])

  const commit = (next: Ends) => {
    window.clearTimeout(commitTimer.current)
    const nextW = (next[1] - next[0]) / (handleX[1] - handleX[0])
    onCommand({
      type: 'set-params',
      values: { w: round(nextW), b: round(next[0] - nextW * handleX[0]) },
    })
    setDraft(null)
  }

  const dataY = (event: PointerEvent<SVGElement>) => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) {
      return null
    }
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    return clampY(
      yMin + ((HEIGHT - PAD.bottom - point.y) / (HEIGHT - PAD.top - PAD.bottom)) * (yMax - yMin),
    )
  }

  const withEnd = (index: 0 | 1, value: number): Ends =>
    index === 0 ? [clampY(value), ends[1]] : [ends[0], clampY(value)]

  const onPointerDown = (index: 0 | 1) => (event: PointerEvent<SVGGElement>) => {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const y = dataY(event)
    if (y !== null) setDraft(withEnd(index, y))
  }
  const onPointerMove = (index: 0 | 1) => (event: PointerEvent<SVGGElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const y = dataY(event)
    if (y !== null) setDraft(withEnd(index, y))
  }
  const onPointerUp = (event: PointerEvent<SVGGElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (draft) commit(draft)
  }
  const onKeyDown = (index: 0 | 1) => (event: KeyboardEvent<SVGGElement>) => {
    if (disabled) return
    const delta = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP
    const change = event.key === 'ArrowUp' ? delta : event.key === 'ArrowDown' ? -delta : 0
    if (change === 0) return
    event.preventDefault()
    const next = withEnd(index, ends[index] + change)
    setDraft(next)
    window.clearTimeout(commitTimer.current)
    commitTimer.current = window.setTimeout(() => commit(next), KEY_COMMIT_MS)
  }
  const onBlur = () => {
    if (draft && commitTimer.current !== undefined) commit(draft)
  }

  const xTicks = Array.from({ length: 6 }, (_, i) => xMin + (i * (xMax - xMin)) / 5)
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (i * (yMax - yMin)) / 4)
  const lineY = (x: number) => slope * x + intercept

  return (
    <div>
      <div className={`${styles['sheet']} ${disabled ? styles['disabled'] : ''}`}>
        <svg
          ref={svgRef}
          className={styles['svg']}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          aria-label={t('level.plot.description', { count: scene.points.length })}
          role="group"
        >
          {yTicks.map((y) => (
            <g key={`y${y}`}>
              <line
                className={styles['grid']}
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={sy(y)}
                y2={sy(y)}
              />
              <text className={styles['tick']} x={PAD.left - 8} y={sy(y) + 4} textAnchor="end">
                {y}
              </text>
            </g>
          ))}
          {xTicks.map((x) => (
            <text
              key={`x${x}`}
              className={styles['tick']}
              x={sx(x)}
              y={HEIGHT - 10}
              textAnchor="middle"
            >
              {x}
            </text>
          ))}
          <line
            className={styles['axis']}
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={sy(yMin)}
            y2={sy(yMin)}
          />
          <line
            className={styles['axis']}
            x1={PAD.left}
            x2={PAD.left}
            y1={sy(yMin)}
            y2={sy(yMax)}
          />

          {scene.points.map(([x, y]) => (
            <line
              key={`r${x},${y}`}
              className={styles['residual']}
              x1={sx(x)}
              x2={sx(x)}
              y1={sy(y)}
              y2={sy(clampY(lineY(x)))}
            />
          ))}
          <line
            className={styles['line']}
            x1={sx(xMin)}
            y1={sy(clampY(lineY(xMin)))}
            x2={sx(xMax)}
            y2={sy(clampY(lineY(xMax)))}
          />
          {scene.points.map(([x, y]) => (
            <circle key={`p${x},${y}`} className={styles['point']} cx={sx(x)} cy={sy(y)} r={4.5} />
          ))}

          {(readOnly ? [] : ([0, 1] as const)).map((index) => (
            <g
              key={index}
              className={styles['handle']}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={index === 0 ? t('level.line.left') : t('level.line.right')}
              aria-valuemin={yMin}
              aria-valuemax={yMax}
              aria-valuenow={Math.round(ends[index] * 10) / 10}
              aria-valuetext={t('level.line.value', { value: ends[index].toFixed(1) })}
              aria-orientation="vertical"
              aria-disabled={disabled}
              onPointerDown={onPointerDown(index)}
              onPointerMove={onPointerMove(index)}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown(index)}
              onBlur={onBlur}
            >
              <circle
                className={styles['handleHit']}
                cx={sx(handleX[index])}
                cy={sy(ends[index])}
                r={24}
              />
              <circle
                className={styles['handleBody']}
                cx={sx(handleX[index])}
                cy={sy(ends[index])}
                r={10}
              />
            </g>
          ))}
        </svg>
      </div>
      {disabled || readOnly ? null : <p className={styles['hint']}>{t('level.line.hint')}</p>}
    </div>
  )
}
