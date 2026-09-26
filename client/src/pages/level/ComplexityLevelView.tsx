import { Button } from '@/components/ui'
import { RegionMap } from '@/components/viz'
import { HyperparameterControls } from '@/components/widgets'
import type { UseLevelSession } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import type { ComplexityScene, ComplexitySnapshot, ConditionFailure } from '@/models'
import { LevelFrame } from './LevelFrame'
import { polynomialTermCount } from './PolynomialTerms'
import styles from './LevelFrame.module.css'

interface ComplexityLevelViewProps {
  readonly game: UseLevelSession
  readonly scene: ComplexityScene
  readonly snapshot: ComplexitySnapshot
  readonly world: number
  readonly level: number
}

const percent = (share: number) => Math.round(share * 100)

const describeNext = (condition: ConditionFailure) =>
  condition.metric === 'attempt'
    ? t('level.result.next.attempt.overfitter')
    : t(`level.result.next.${condition.metric}` as MessageKey, { value: condition.expected })

/** W2-L4 The Overfitter: pick the model's flexibility, look at the border, check on new data. */
export function ComplexityLevelView({
  game,
  scene,
  snapshot,
  world,
  level,
}: ComplexityLevelViewProps) {
  const result = game.view.session.lastResult
  const trained = snapshot.trained

  const resultText = result
    ? {
        title: result.passed
          ? t('level.result.complexity.passed.title')
          : t('level.result.complexity.failed.title'),
        body: t(
          result.passed
            ? 'level.result.complexity.passed.body'
            : 'level.result.complexity.failed.body',
          {
            test: percent(result.metrics.test_accuracy),
            train: percent(result.metrics.accuracy),
          },
        ),
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
          <HyperparameterControls
            name="degree"
            label={t('level.complexity.degree')}
            hint={t('level.complexity.degree.hint')}
            value={snapshot.degree}
            min={scene.degree.min}
            max={scene.degree.max}
            step={scene.degree.step}
            actionLabel={t('level.train')}
            action={{ type: 'train' }}
            disabled={false}
            onCommand={game.dispatch}
          />
          <p className={styles['stats']}>
            {t('level.complexity.terms', { count: polynomialTermCount(snapshot.degree) })}
          </p>
          <p className={styles['mission']} aria-live="polite">
            {trained
              ? t('level.complexity.trained', {
                  degree: trained.degree,
                  correct: trained.correct,
                  total: trained.total,
                })
              : t('level.complexity.none')}
          </p>
          <Button variant="primary" onClick={() => game.dispatch({ type: 'check' })}>
            {t('level.complexity.check')}
          </Button>
        </>
      }
    />
  )
}
