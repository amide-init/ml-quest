import { Button } from '@/components/ui'
import { LossLandscapeMap } from '@/components/viz'
import { usePlayback, usePrefersReducedMotion, type UseLevelSession } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import type { ConditionFailure, LandscapeMap, LandscapeSnapshot } from '@/models'
import { LevelFrame } from './LevelFrame'
import styles from './LevelFrame.module.css'

const rollDuration = (steps: number) => Math.min(2200, Math.max(700, steps * 60))

interface DescentLevelViewProps {
  readonly game: UseLevelSession
  readonly scene: LandscapeMap
  readonly snapshot: LandscapeSnapshot
  readonly world: number
  readonly level: number
}

/** Level-specific next-star wording: this level counts roll steps, not training epochs. */
const describeNext = (condition: ConditionFailure) =>
  condition.metric === 'epochs_to_converge'
    ? t('level.result.next.epochs_to_converge.landscape', { value: condition.expected })
    : t(`level.result.next.${condition.metric}` as MessageKey, { value: condition.expected })

/** W1-L5 Bumpy Terrain: pick where the ball starts, roll it, see which valley it settles in. */
export function DescentLevelView({ game, scene, snapshot, world, level }: DescentLevelViewProps) {
  const reducedMotion = usePrefersReducedMotion()
  const rolled = snapshot.steps > 0
  const step = usePlayback(
    rolled ? snapshot.path : null,
    snapshot.steps,
    rollDuration(snapshot.steps),
    reducedMotion,
  )
  const replayDone = !rolled || step >= snapshot.steps
  const playing = game.view.session.phase === 'playing'
  const result = game.view.session.lastResult

  const resultText =
    result && replayDone
      ? result.passed
        ? {
            title: t('level.result.valley.passed.title'),
            body: t('level.result.valley.passed.body', { steps: snapshot.steps }),
          }
        : {
            title: t('level.result.valley.local.title'),
            body: t('level.result.valley.local.body', {
              distance: result.metrics.distance_to_global_min.toFixed(2),
            }),
          }
      : null

  return (
    <LevelFrame
      game={game}
      world={world}
      level={level}
      resultText={resultText}
      describeNext={describeNext}
      pending={
        <p className={styles['stats']} aria-live="polite">
          {t('level.rolling.progress', { step, total: snapshot.steps })}
        </p>
      }
      visual={
        <LossLandscapeMap
          map={scene}
          snapshot={snapshot}
          showPreview={false}
          showTarget={!playing}
          label={t('level.map.description', { loss: snapshot.loss.toFixed(3) })}
          {...(rolled ? { shownSteps: step } : {})}
          {...(playing && !rolled
            ? { onPickStart: (point) => game.dispatch({ type: 'set-start', point }) }
            : {})}
        />
      }
      controls={
        <>
          <p className={styles['mission']}>{t('level.start.hint')}</p>
          <Button variant="primary" onClick={() => game.dispatch({ type: 'train' })}>
            {t('level.roll')}
          </Button>
        </>
      }
    />
  )
}
