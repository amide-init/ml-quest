import type { LandscapeMap, LandscapeSnapshot, Point } from '@/models'
import styles from './LossLandscapeMap.module.css'

const WIDTH = 600
const HEIGHT = 420

interface LossLandscapeMapProps {
  readonly map: LandscapeMap
  readonly snapshot: LandscapeSnapshot
  /** Show the downhill arrow and where the next step would land. */
  readonly showPreview: boolean
  /** Accessible description of the current state. */
  readonly label: string
}

/**
 * A loss landscape drawn as a contour map (World 1). Pure view of a snapshot:
 * landscape coordinates have y pointing up, so they are flipped for SVG.
 */
export function LossLandscapeMap({ map, snapshot, showPreview, label }: LossLandscapeMapProps) {
  const [minX, minY] = map.bounds.min
  const [maxX, maxY] = map.bounds.max
  const scaleX = WIDTH / (maxX - minX)
  const scaleY = HEIGHT / (maxY - minY)
  const toSvg = ([x, y]: Point): Point => [(x - minX) * scaleX, (maxY - y) * scaleY]
  // Rendering only: an off-map ball is drawn at the edge so the player can see where it left (RULES.md §2).
  const toSvgClamped = (point: Point): Point => {
    const [sx, sy] = toSvg(point)
    return [Math.min(Math.max(sx, 10), WIDTH - 10), Math.min(Math.max(sy, 10), HEIGHT - 10)]
  }

  const path = (points: readonly Point[], closed: boolean) =>
    points
      .map((point, index) => {
        const [sx, sy] = toSvg(point)
        return `${index === 0 ? 'M' : 'L'}${sx.toFixed(1)} ${sy.toFixed(1)}`
      })
      .join('') + (closed ? 'Z' : '')

  const contourStroke = (levelIndex: number) => {
    const ridgeShare = Math.round((levelIndex / Math.max(map.levelCount - 1, 1)) * 100)
    return `color-mix(in oklab, var(--color-ridge) ${ridgeShare}%, var(--color-contour))`
  }

  const diverged = snapshot.status === 'diverged'
  const [ballX, ballY] = toSvgClamped(snapshot.position)
  const [targetX, targetY] = toSvg(map.minimum)
  const [previewX, previewY] = toSvg(snapshot.preview)
  const arrowAngle = Math.atan2(previewY - ballY, previewX - ballX)
  const trail = snapshot.path.map(toSvgClamped)

  return (
    <div className={styles['sheet']}>
      <svg
        className={styles['svg']}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={label}
      >
        {map.contours.map((contour) => (
          <path
            key={`${contour.levelIndex}:${contour.points[0]?.join(',')}`}
            className={styles['contour']}
            d={path(contour.points, contour.closed)}
            style={{ stroke: contourStroke(contour.levelIndex) }}
          />
        ))}

        <ellipse
          className={styles['target']}
          cx={targetX}
          cy={targetY}
          rx={map.targetRadius * scaleX}
          ry={map.targetRadius * scaleY}
        />

        <polyline className={styles['trail']} points={trail.map((p) => p.join(',')).join(' ')} />
        {trail.slice(0, -1).map(([x, y], index) => (
          // Positions can repeat (a zero-size step), so the step index is the stable identity here.
          // oxlint-disable-next-line react/no-array-index-key
          <circle key={index} className={styles['trailDot']} cx={x} cy={y} r={2.5} />
        ))}

        {showPreview && !diverged ? (
          <g aria-hidden="true">
            <line className={styles['arrow']} x1={ballX} y1={ballY} x2={previewX} y2={previewY} />
            <path
              className={styles['arrowHead']}
              d="M0 0 L-9 -5 L-9 5 Z"
              transform={`translate(${previewX} ${previewY}) rotate(${(arrowAngle * 180) / Math.PI}) translate(-12 0)`}
            />
            <circle className={styles['ghost']} cx={previewX} cy={previewY} r={9} />
          </g>
        ) : null}

        <g
          className={`${styles['ball']} ${diverged ? styles['offMap'] : ''}`}
          style={{ transform: `translate(${ballX}px, ${ballY}px)` }}
        >
          <circle className={styles['ballHalo']} r={17} />
          <circle className={styles['ballBody']} r={9} />
        </g>
      </svg>
    </div>
  )
}
