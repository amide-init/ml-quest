import { t } from '@/i18n'
import type { TrainingRun } from '@/models'
import styles from './LossCurve.module.css'

const WIDTH = 600
const HEIGHT = 220
const PAD = { left: 48, right: 16, top: 16, bottom: 30 }

interface LossCurveProps {
  readonly run: TrainingRun | null
  /** How many epochs of the run to draw (for replaying training). */
  readonly shownEpochs: number
  readonly maxEpochs: number
  /** The "converged" line. */
  readonly targetLoss: number
  /** Top of the scale; losses above it are drawn at the top edge (a blow-up leaves the chart). */
  readonly initialLoss: number
}

/**
 * Loss per epoch on a log scale, so both a slow crawl and an explosion stay readable.
 * Pure view of a training run.
 */
export function LossCurve({
  run,
  shownEpochs,
  maxEpochs,
  targetLoss,
  initialLoss,
}: LossCurveProps) {
  const low = Math.log10(targetLoss / 3)
  const high = Math.log10(initialLoss * 3)
  const sx = (epoch: number) => PAD.left + (epoch / maxEpochs) * (WIDTH - PAD.left - PAD.right)
  const sy = (loss: number) => {
    const value = Number.isFinite(loss) && loss > 0 ? Math.log10(loss) : high
    const clamped = Math.min(Math.max(value, low), high)
    return PAD.top + ((high - clamped) / (high - low)) * (HEIGHT - PAD.top - PAD.bottom)
  }

  const points = (run?.epochs ?? [])
    .slice(0, shownEpochs + 1)
    .map((epoch, index) => [sx(index), sy(epoch.loss)])
  const head = points.at(-1)
  const xTicks = [0, Math.round(maxEpochs / 2), maxEpochs]
  const yTicks = [targetLoss, initialLoss].map((value) => Number(value.toPrecision(2)))

  return (
    <div className={styles['sheet']}>
      <svg
        className={styles['svg']}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('level.curve.description', { epochs: maxEpochs })}
      >
        <line
          className={styles['axis']}
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={HEIGHT - PAD.bottom}
          y2={HEIGHT - PAD.bottom}
        />
        <line
          className={styles['axis']}
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={HEIGHT - PAD.bottom}
        />
        {xTicks.map((epoch) => (
          <text
            key={`x${epoch}`}
            className={styles['tick']}
            x={sx(epoch)}
            y={HEIGHT - 10}
            textAnchor="middle"
          >
            {epoch}
          </text>
        ))}
        {yTicks.map((loss) => (
          <text
            key={`y${loss}`}
            className={styles['tick']}
            x={PAD.left - 8}
            y={sy(loss) + 4}
            textAnchor="end"
          >
            {loss}
          </text>
        ))}
        <text
          className={styles['tick']}
          x={WIDTH - PAD.right}
          y={HEIGHT - 10}
          textAnchor="end"
          dx={-28}
        >
          {t('level.curve.epochs')}
        </text>

        <line
          className={styles['target']}
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={sy(targetLoss)}
          y2={sy(targetLoss)}
        />
        <text
          className={styles['targetLabel']}
          x={WIDTH - PAD.right - 4}
          y={sy(targetLoss) - 6}
          textAnchor="end"
        >
          {t('level.curve.target')}
        </text>

        {points.length > 0 ? (
          <>
            <polyline
              className={styles['curve']}
              points={points.map((p) => p.join(',')).join(' ')}
            />
            {head ? <circle className={styles['head']} cx={head[0]} cy={head[1]} r={5} /> : null}
          </>
        ) : (
          <text className={styles['empty']} x={WIDTH / 2} y={HEIGHT / 2} textAnchor="middle">
            {t('level.curve.empty')}
          </text>
        )}
      </svg>
    </div>
  )
}
