import { t } from '@/i18n'
import styles from './SigmoidPlot.module.css'

const WIDTH = 600
const HEIGHT = 320
const PAD = { left: 52, right: 16, top: 20, bottom: 28 }
/** The confidence each point needs (W2-L2 pass condition). */
const CONFIDENT = 0.8

interface SigmoidPlotProps {
  readonly points: readonly { readonly x: number; readonly label: number }[]
  /** Probability of each point's TRUE class, in the same order as points. */
  readonly confidences: readonly number[]
  readonly slope: number
  readonly threshold: number
  readonly xMin: number
  readonly xMax: number
}

/**
 * P(circle) along x as an S-curve (W2-L2). Squares sit at 0, circles at 1; a line joins each point
 * to the curve, and points under 80% confidence for their own kind are marked in orange.
 */
export function SigmoidPlot({
  points,
  confidences,
  slope,
  threshold,
  xMin,
  xMax,
}: SigmoidPlotProps) {
  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin)) * (WIDTH - PAD.left - PAD.right)
  const sy = (p: number) => PAD.top + (1 - p) * (HEIGHT - PAD.top - PAD.bottom)
  const probability = (x: number) => 1 / (1 + Math.exp(-slope * (x - threshold)))
  const curve = Array.from({ length: 161 }, (_, i) => {
    const x = xMin + (i / 160) * (xMax - xMin)
    return `${sx(x)},${sy(probability(x))}`
  }).join(' ')

  return (
    <div className={styles['sheet']}>
      <svg
        className={styles['svg']}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('level.sigmoid.plot', { count: points.length })}
      >
        <line
          className={styles['axis']}
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={sy(0)}
          y2={sy(0)}
        />
        <line className={styles['axis']} x1={PAD.left} x2={PAD.left} y1={sy(0)} y2={sy(1)} />
        {[0, 0.2, 0.5, 0.8, 1].map((p) => (
          <text key={p} className={styles['tick']} x={PAD.left - 8} y={sy(p) + 4} textAnchor="end">
            {p}
          </text>
        ))}
        <text className={styles['tick']} x={PAD.left + 6} y={PAD.top - 6}>
          {t('level.sigmoid.axis')}
        </text>
        {[CONFIDENT, 1 - CONFIDENT].map((p) => (
          <line
            key={p}
            className={styles['band']}
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={sy(p)}
            y2={sy(p)}
          />
        ))}
        {threshold >= xMin && threshold <= xMax ? (
          <line
            className={styles['threshold']}
            x1={sx(threshold)}
            x2={sx(threshold)}
            y1={sy(0)}
            y2={sy(1)}
          />
        ) : null}

        {points.map((point, index) => {
          const weak = (confidences[index] ?? 0) < CONFIDENT
          return (
            <line
              key={`l${point.x}`}
              className={weak ? styles['weak'] : styles['link']}
              x1={sx(point.x)}
              x2={sx(point.x)}
              y1={sy(point.label)}
              y2={sy(probability(point.x))}
            />
          )
        })}
        <polyline className={styles['curve']} points={curve} />

        {points.map((point, index) => {
          const weak = (confidences[index] ?? 0) < CONFIDENT
          const cx = sx(point.x)
          const cy = sy(point.label)
          return (
            <g key={`p${point.x}`}>
              {point.label === 1 ? (
                <circle className={styles['class1']} cx={cx} cy={cy} r={6} />
              ) : (
                <rect
                  className={styles['class0']}
                  x={cx - 5.5}
                  y={cy - 5.5}
                  width={11}
                  height={11}
                />
              )}
              {weak ? <circle className={styles['weakMarker']} cx={cx} cy={cy} r={11} /> : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
