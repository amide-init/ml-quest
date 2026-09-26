import { Button } from '@/components/ui'
import { RegionMap } from '@/components/viz'
import { HyperparameterControls } from '@/components/widgets'
import type { UseLevelSession } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import type { ComplexityScene, ComplexitySnapshot, ConditionFailure, EvalResult } from '@/models'
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

const describeNext = (regularized: boolean) => (condition: ConditionFailure) => {
  if (condition.metric === 'attempt') {
    return regularized
      ? t('level.result.next.attempt.tame', { value: condition.expected })
      : t('level.result.next.attempt.overfitter')
  }
  if (condition.metric === 'accuracy_gap') {
    return t('level.result.next.accuracy_gap')
  }
  return t(`level.result.next.${condition.metric}` as MessageKey, { value: condition.expected })
}

/** W2-L5 talks about the gap between the two scores; W2-L4 about the hidden score alone. */
function describeResult(result: EvalResult, regularized: boolean) {
  const values = {
    test: percent(result.metrics.test_accuracy),
    train: percent(result.metrics.accuracy),
    gap: percent(result.metrics.accuracy_gap),
  }
  if (!regularized) {
    return result.passed
      ? {
          title: t('level.result.complexity.passed.title'),
          body: t('level.result.complexity.passed.body', values),
        }
      : {
          title: t('level.result.complexity.failed.title'),
          body: t('level.result.complexity.failed.body', values),
        }
  }
  if (result.passed) {
    return {
      title: t('level.result.tame.passed.title'),
      body: t('level.result.tame.passed.body', values),
    }
  }
  // Training below new people means the penalty is so strong the model can't even fit what it saw.
  return result.metrics.accuracy < result.metrics.test_accuracy
    ? { title: t('level.result.tame.under.title'), body: t('level.result.tame.under.body', values) }
    : { title: t('level.result.tame.over.title'), body: t('level.result.tame.over.body', values) }
}

/**
 * W2-L4 The Overfitter: pick the model's flexibility, look at the border, check on new data.
 * W2-L5 Tame It: the degree is fixed and high; a regularization slider tames it instead.
 */
export function ComplexityLevelView({
  game,
  scene,
  snapshot,
  world,
  level,
}: ComplexityLevelViewProps) {
  const result = game.view.session.lastResult
  const trained = snapshot.trained

  const regularization = scene.regularization
  const resultText = result ? describeResult(result, regularization !== null) : null

  return (
    <LevelFrame
      game={game}
      world={world}
      level={level}
      resultText={resultText}
      describeNext={describeNext(regularization !== null)}
      visual={
        <div className={styles['visualStack']}>
          <RegionMap
            points={scene.points}
            view={scene.view}
            regions={trained?.regions ?? null}
            boundary={trained?.boundary ?? []}
            checked={snapshot.checked}
          />
          {snapshot.checked ? (
            <p className={styles['mission']}>
              {t('level.complexity.checked', {
                total: snapshot.checked.length,
                wrong: snapshot.checked.filter((point) => !point.correct).length,
              })}
            </p>
          ) : null}
        </div>
      }
      controls={
        <>
          {scene.degree ? (
            <HyperparameterControls
              name="degree"
              label={t('level.complexity.degree')}
              hint={t('level.complexity.degree.hint')}
              value={snapshot.degree}
              min={scene.degree.min}
              max={scene.degree.max}
              step={scene.degree.step}
              {...(regularization
                ? {}
                : { actionLabel: t('level.train'), action: { type: 'train' } })}
              disabled={false}
              onCommand={game.dispatch}
            />
          ) : null}
          <p className={styles['stats']}>
            {scene.degree
              ? t('level.complexity.terms', { count: polynomialTermCount(snapshot.degree) })
              : t('level.complexity.fixed', {
                  degree: snapshot.degree,
                  count: polynomialTermCount(snapshot.degree),
                })}
          </p>
          {regularization ? (
            <HyperparameterControls
              name="regularization"
              label={t('level.regularization.label')}
              hint={t('level.regularization.hint')}
              value={snapshot.regularization}
              min={regularization.min}
              max={regularization.max}
              step={regularization.step}
              actionLabel={t('level.train')}
              action={{ type: 'train' }}
              disabled={false}
              onCommand={game.dispatch}
            />
          ) : null}
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
