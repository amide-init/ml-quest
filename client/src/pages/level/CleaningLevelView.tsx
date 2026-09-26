import { Button } from '@/components/ui'
import { LineFitPlot } from '@/components/widgets'
import type { UseLevelSession } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import type { CleaningScene, CleaningSnapshot, ConditionFailure } from '@/models'
import { LevelFrame } from './LevelFrame'
import styles from './LevelFrame.module.css'

interface CleaningLevelViewProps {
  readonly game: UseLevelSession
  readonly scene: CleaningScene
  readonly snapshot: CleaningSnapshot
  readonly world: number
  readonly level: number
}

const describeNext = (condition: ConditionFailure) =>
  condition.metric === 'good_points_removed'
    ? t('level.result.next.good_points_removed', { actual: condition.actual })
    : t(`level.result.next.${condition.metric}` as MessageKey, { value: condition.expected })

/** W1-L6 Dirty Data: remove bad points, watch the best-fit line react, check on fresh data. */
export function CleaningLevelView({ game, scene, snapshot, world, level }: CleaningLevelViewProps) {
  const playing = game.view.session.phase === 'playing'
  const result = game.view.session.lastResult
  const target = game.view.level.stars.pass
  const targetValue = 'metric' in target ? target.value : Number.NaN

  const resultText = result
    ? result.passed
      ? {
          title: t('level.result.clean.passed.title'),
          body: t('level.result.clean.passed.body', {
            loss: result.metrics.test_loss.toFixed(2),
            removed: result.metrics.points_removed,
          }),
        }
      : {
          title: t('level.result.clean.failed.title'),
          body: t('level.result.clean.failed.body', {
            loss: result.metrics.test_loss.toFixed(2),
            target: targetValue,
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
      visual={
        <div>
          <LineFitPlot
            scene={scene}
            w={snapshot.w}
            b={snapshot.b}
            disabled={!playing}
            readOnly
            removed={snapshot.removed}
            onTogglePoint={(index) => game.dispatch({ type: 'toggle-point', index })}
            onCommand={game.dispatch}
          />
        </div>
      }
      controls={
        <>
          <p className={styles['mission']}>{t('level.cleaning.hint')}</p>
          <p className={styles['stats']}>
            {t('level.cleaning.removed', {
              count: snapshot.removed.length,
              total: scene.points.length,
            })}
          </p>
          <Button variant="primary" onClick={() => game.dispatch({ type: 'check' })}>
            {t('level.cleaning.check')}
          </Button>
          {snapshot.removed.length > 0 ? (
            <Button size="small" onClick={() => game.dispatch({ type: 'reset' })}>
              {t('level.cleaning.restore')}
            </Button>
          ) : null}
        </>
      }
    />
  )
}
