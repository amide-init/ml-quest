import { t } from '@/i18n'
import type { ContourLine, DecisionRegions, LabelledPoint, RegressionScene } from '@/models'
import styles from './RegionMap.module.css'

const WIDTH = 600
const HEIGHT = 480

interface RegionMapProps {
  readonly points: readonly LabelledPoint[]
  readonly view: RegressionScene['view']
  /** The trained model's decision regions, or null before training. */
  readonly regions: DecisionRegions | null
  readonly boundary: readonly ContourLine[]
}

/**
 * Labelled points over a trained classifier's decision regions and border (W2-L3). Regions are
 * drawn as horizontal runs of same-class cells, so a 60×48 grid stays a few hundred shapes.
 */
export function RegionMap({ points, view, regions, boundary }: RegionMapProps) {
  const { xMin, xMax, yMin, yMax } = view
  const sx = (x: number) => ((x - xMin) / (xMax - xMin)) * WIDTH
  const sy = (y: number) => HEIGHT - ((y - yMin) / (yMax - yMin)) * HEIGHT

  const runs: { row: number; start: number; end: number; cls: number }[] = []
  if (regions) {
    for (let row = 0; row < regions.rows; row++) {
      let start = 0
      for (let col = 1; col <= regions.cols; col++) {
        const cls = regions.classes[row * regions.cols + start]
        if (col === regions.cols || regions.classes[row * regions.cols + col] !== cls) {
          runs.push({ row, start, end: col, cls: cls ?? 0 })
          start = col
        }
      }
    }
  }
  const cellW = regions ? WIDTH / regions.cols : 0
  const cellH = regions ? HEIGHT / regions.rows : 0
  // One path per class: a single fill is painted once, so the small overlaps that hide seams between
  // strips can't double the transparency (separate semi-transparent rects would show as stripes).
  const OVERLAP = 0.6
  const regionPath = (cls: number) =>
    runs
      .filter((run) => run.cls === cls)
      .map((run) => {
        const x = run.start * cellW
        const y = run.row * cellH
        const w = (run.end - run.start) * cellW + OVERLAP
        return `M${x} ${y}h${w}v${cellH + OVERLAP}h${-w}Z`
      })
      .join('')

  return (
    <div className={styles['sheet']}>
      <svg
        className={styles['svg']}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t('level.features.plot', { count: points.length })}
      >
        {[0, 1].map((cls) => (
          <path
            key={cls}
            className={cls === 1 ? styles['region1'] : styles['region0']}
            d={regionPath(cls)}
          />
        ))}
        {boundary.map((line) => (
          <path
            key={`${line.points[0]?.join(',')}`}
            className={styles['border']}
            d={
              line.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${sx(x)} ${sy(y)}`).join('') +
              (line.closed ? 'Z' : '')
            }
          />
        ))}
        {points.map((point) =>
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
        {regions ? null : (
          <text className={styles['empty']} x={WIDTH / 2} y={28} textAnchor="middle">
            {t('level.features.none')}
          </text>
        )}
      </svg>
    </div>
  )
}
