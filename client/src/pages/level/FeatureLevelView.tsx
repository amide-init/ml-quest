import { Button } from '@/components/ui'
import { RegionMap } from '@/components/viz'
import { FeaturePicker } from '@/components/widgets'
import type { UseLevelSession } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import type { ConditionFailure, FeatureScene, FeatureSnapshot } from '@/models'
import { LevelFrame } from './LevelFrame'
import styles from './LevelFrame.module.css'

interface FeatureLevelViewProps {
  readonly game: UseLevelSession
  readonly scene: FeatureScene
  readonly snapshot: FeatureSnapshot
  readonly world: number
  readonly level: number
}

const percent = (share: number) => Math.round(share * 100)

const describeNext = (condition: ConditionFailure) =>
  t(`level.result.next.${condition.metric}` as MessageKey, {
    value: condition.metric.includes('accuracy')
      ? `${percent(condition.expected)}%`
      : condition.expected,
  })

/** W2-L3 Not a Straight Line: choose the model's features, train, and see the border it can draw. */
export function FeatureLevelView({ game, scene, snapshot, world, level }: FeatureLevelViewProps) {
  const playing = game.view.session.phase === 'playing'
  const result = game.view.session.lastResult
  const trained = snapshot.trained
  const featureNames = (trained?.features ?? [])
    .map((feature) => t(`level.features.${feature}` as MessageKey))
    .join(', ')

  const resultText = result
    ? result.passed
      ? {
          title: t('level.result.features.passed.title'),
          body: t('level.result.features.passed.body', {
            accuracy: percent(result.metrics.accuracy),
            count: result.metrics.feature_count,
          }),
        }
      : {
          title: t('level.result.features.failed.title'),
          body: t('level.result.features.failed.body', {
            accuracy: percent(result.metrics.accuracy),
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
        <RegionMap
          points={scene.points}
          view={scene.view}
          regions={trained?.regions ?? null}
          boundary={trained?.boundary ?? []}
        />
      }
      controls={
        <>
          <FeaturePicker
            available={scene.available}
            selected={snapshot.selected}
            disabled={!playing}
            onCommand={game.dispatch}
          />
          <p className={styles['stats']}>
            {t('level.features.count', { count: snapshot.selected.length })}
          </p>
          {trained ? (
            <p className={styles['mission']} aria-live="polite">
              {t('level.features.trained', {
                correct: trained.correct,
                total: trained.total,
                features: featureNames || '—',
              })}
            </p>
          ) : null}
          <Button variant="primary" onClick={() => game.dispatch({ type: 'train' })}>
            {t('level.train')}
          </Button>
        </>
      }
    />
  )
}
