import { useEffect, useState } from 'react'
import { Button } from '@/components/ui'
import { t } from '@/i18n'
import { CONTOURS, DESCENT, LEVEL_COUNT, MINIMUM } from './ValleyLandscapeData'
import styles from './ValleyLandscape.module.css'

const STEP_INTERVAL_MS = 520
const TOTAL_STEPS = DESCENT.length - 1

/** Contour colour runs from valley green (low loss) to ridge ochre (high loss). */
function contourStroke(level: number): string {
  const ridgeShare = Math.round((level / (LEVEL_COUNT - 1)) * 100)
  return `color-mix(in oklab, var(--color-ridge) ${ridgeShare}%, var(--color-contour))`
}

function pointAt(step: number) {
  const point = DESCENT[Math.min(Math.max(step, 0), TOTAL_STEPS)]
  if (!point) {
    throw new Error(`No descent point for step ${step}`)
  }
  return point
}

interface ValleyLandscapeProps {
  /** When true, show the finished descent without animating. */
  readonly reducedMotion: boolean
}

/**
 * The home-page hero: a loss landscape drawn as a contour map, with the Learner (the ball)
 * taking real gradient-descent steps into the valley.
 */
export function ValleyLandscape({ reducedMotion }: ValleyLandscapeProps) {
  const [animatedStep, setAnimatedStep] = useState(0)
  // With reduced motion there is nothing to animate: show the finished descent.
  const step = reducedMotion ? TOTAL_STEPS : animatedStep

  useEffect(() => {
    if (reducedMotion || animatedStep >= TOTAL_STEPS) {
      return
    }
    const timer = window.setTimeout(
      () => setAnimatedStep((current) => current + 1),
      STEP_INTERVAL_MS,
    )
    return () => window.clearTimeout(timer)
  }, [reducedMotion, animatedStep])

  const ball = pointAt(step)
  const visited = DESCENT.slice(0, step + 1)
  const start = pointAt(0)
  const end = pointAt(TOTAL_STEPS)
  const valleyContour = CONTOURS.find((contour) => contour.level === 1)

  return (
    <figure className={styles['figure']}>
      <div className={styles['sheet']}>
        <svg
          className={styles['svg']}
          viewBox="0 0 600 420"
          role="img"
          aria-label={t('home.demo.description', {
            total: TOTAL_STEPS,
            start: start.loss.toFixed(2),
            end: end.loss.toFixed(2),
          })}
        >
          {valleyContour ? <path className={styles['valleyFill']} d={valleyContour.d} /> : null}
          {CONTOURS.map((contour) => (
            <path
              key={contour.d}
              className={styles['contour']}
              d={contour.d}
              style={{ stroke: contourStroke(contour.level) }}
            />
          ))}

          <g className={styles['minimum']} aria-hidden="true">
            <line x1={MINIMUM.x - 7} y1={MINIMUM.y - 7} x2={MINIMUM.x + 7} y2={MINIMUM.y + 7} />
            <line x1={MINIMUM.x - 7} y1={MINIMUM.y + 7} x2={MINIMUM.x + 7} y2={MINIMUM.y - 7} />
          </g>

          <polyline
            className={styles['trail']}
            points={visited.map((point) => `${point.x},${point.y}`).join(' ')}
          />
          {visited.slice(0, -1).map((point) => (
            <circle
              key={`${point.x},${point.y}`}
              className={styles['stepDot']}
              cx={point.x}
              cy={point.y}
              r={2.5}
            />
          ))}

          <g
            className={styles['ball']}
            style={{ transform: `translate(${ball.x}px, ${ball.y}px)` }}
          >
            <circle className={styles['ballHalo']} r={17} />
            <circle className={styles['ballBody']} r={9} />
          </g>
        </svg>
      </div>

      <div className={styles['readout']}>
        {/* The svg's label already describes the whole descent; per-step numbers would be noise for screen readers. */}
        <span className={styles['stat']} aria-hidden="true">
          {t('home.demo.step', { step, total: TOTAL_STEPS })}
        </span>
        <span className={styles['stat']} aria-hidden="true">
          <strong>{t('home.demo.loss', { loss: ball.loss.toFixed(2) })}</strong>
        </span>
        {reducedMotion ? null : (
          <span className={styles['replay']}>
            <Button size="small" onClick={() => setAnimatedStep(0)}>
              {t('home.demo.replay')}
            </Button>
          </span>
        )}
      </div>
      <figcaption className={styles['caption']}>{t('home.demo.caption')}</figcaption>
    </figure>
  )
}
