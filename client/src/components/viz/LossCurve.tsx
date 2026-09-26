import { t } from '@/i18n'
import styles from './LossCurve.module.css'

const WIDTH = 600
const HEIGHT = 220
const PAD = { left: 48, right: 16, top: 16, bottom: 30 }

interface LossCurveProps {
  /** Loss per epoch (index 0 = before training), or null before the first run. */
  readonly losses: readonly number[] | null
  /** How many epochs of the run to draw (for replaying training). */
  readonly shownEpochs: number
  readonly maxEpochs: number
  /** The "converged" line. */
  readonly targetLoss: number
  /** Top of the scale; losses above it are drawn at the top edge (a blow-up leaves the chart). */
  readonly initialLoss: number
  /** A reference run drawn underneath, e.g. the best unscaled run (W1-L7). */
  readonly baseline?: readonly number[]
  /** Log-scale epochs, so a 3-epoch run and a 150-epoch run are both readable. */
  readonly logEpochs?: boolean
  /** Legend labels, shown when a baseline is drawn. */
  readonly legend?: { readonly baseline: string; readonly run: string }
}

/**
 * Loss per epoch on a log scale, so both a slow crawl and an explosion stay readable.
 * Pure view of recorded runs.
 */
export function LossCurve({
  losses,
  shownEpochs,
  maxEpochs,
  targetLoss,
  initialLoss,
  baseline,
  logEpochs = false,
  legend,
}: LossCurveProps) {
  const low = Math.log10(targetLoss / 3)
  const high = Math.log10(initialLoss * 3)
  const epochShare = (epoch: number) =>
    logEpochs ? Math.log10(epoch + 1) / Math.log10(maxEpochs + 1) : epoch / maxEpochs
  const sx = (epoch: number) => PAD.left + epochShare(epoch) * (WIDTH - PAD.left - PAD.right)
  const sy = (loss: number) => {
    const value = Number.isFinite(loss) && loss > 0 ? Math.log10(loss) : high
    const clamped = Math.min(Math.max(value, low), high)
    return PAD.top + ((high - clamped) / (high - low)) * (HEIGHT - PAD.top - PAD.bottom)
  }
  const toPoints = (values: readonly number[]) =>
    values.map((loss, epoch) => `${sx(epoch)},${sy(loss)}`).join(' ')

  const shown = (losses ?? []).slice(0, shownEpochs + 1)
  const headLoss = shown.at(-1)
  const xTicks = logEpochs
    ? [0, 1, 10, 100, 1000].filter((epoch) => epoch < maxEpochs).concat(maxEpochs)
    : [0, Math.round(maxEpochs / 2), maxEpochs]
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
          dx={-36}
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

        {baseline ? <polyline className={styles['baseline']} points={toPoints(baseline)} /> : null}

        {shown.length > 0 ? (
          <>
            <polyline className={styles['curve']} points={toPoints(shown)} />
            {headLoss !== undefined ? (
              <circle
                className={styles['head']}
                cx={sx(shown.length - 1)}
                cy={sy(headLoss)}
                r={5}
              />
            ) : null}
          </>
        ) : baseline ? null : (
          <text className={styles['empty']} x={WIDTH / 2} y={HEIGHT / 2} textAnchor="middle">
            {t('level.curve.empty')}
          </text>
        )}

        {baseline && legend ? (
          <g className={styles['legend']} transform={`translate(${PAD.left + 12} ${PAD.top + 12})`}>
            <line className={styles['baseline']} x1={0} x2={22} y1={0} y2={0} />
            <text className={styles['tick']} x={28} y={4}>
              {legend.baseline}
            </text>
            <line className={styles['curve']} x1={0} x2={22} y1={18} y2={18} />
            <text className={styles['tick']} x={28} y={22}>
              {legend.run}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  )
}
