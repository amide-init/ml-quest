import { Button } from '@/components/ui'
import { RegionMap } from '@/components/viz'
import { HyperparameterControls } from '@/components/widgets'
import type { UseLevelSession } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import { assertNever } from '@/lib'
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

/** What the level is about, from the controls it offers: each talks about its result differently. */
type Focus = 'overfit' | 'gap' | 'minority'

const focusOf = (scene: ComplexityScene): Focus =>
  scene.oversample ? 'minority' : scene.regularization ? 'gap' : 'overfit'

const describeNext = (focus: Focus) => (condition: ConditionFailure) => {
  if (condition.metric === 'attempt') {
    return focus === 'overfit'
      ? t('level.result.next.attempt.overfitter')
      : t('level.result.next.attempt.within', { value: condition.expected })
  }
  if (condition.metric === 'accuracy_gap') {
    return t('level.result.next.accuracy_gap')
  }
  if (condition.metric === 'test_accuracy' && focus === 'minority') {
    return t('level.result.next.test_accuracy.minority', { value: percent(condition.expected) })
  }
  return t(`level.result.next.${condition.metric}` as MessageKey, { value: condition.expected })
}

function describeResult(result: EvalResult, focus: Focus) {
  const values = {
    test: percent(result.metrics.test_accuracy),
    train: percent(result.metrics.accuracy),
    gap: percent(result.metrics.accuracy_gap),
    recall: percent(result.metrics.test_recall),
  }
  switch (focus) {
    case 'overfit':
      return result.passed
        ? {
            title: t('level.result.complexity.passed.title'),
            body: t('level.result.complexity.passed.body', values),
          }
        : {
            title: t('level.result.complexity.failed.title'),
            body: t('level.result.complexity.failed.body', values),
          }
    case 'gap':
      if (result.passed) {
        return {
          title: t('level.result.tame.passed.title'),
          body: t('level.result.tame.passed.body', values),
        }
      }
      // Training below new people means the penalty is so strong the model can't even fit what it saw.
      return result.metrics.accuracy < result.metrics.test_accuracy
        ? {
            title: t('level.result.tame.under.title'),
            body: t('level.result.tame.under.body', values),
          }
        : {
            title: t('level.result.tame.over.title'),
            body: t('level.result.tame.over.body', values),
          }
    case 'minority':
      return result.passed
        ? {
            title: t('level.result.minority.passed.title'),
            body: t('level.result.minority.passed.body', values),
          }
        : {
            title: t('level.result.minority.failed.title'),
            body: t('level.result.minority.failed.body', values),
          }
    default:
      return assertNever(focus)
  }
}

/**
 * W2-L4 The Overfitter: pick the model's flexibility, look at the border, check on new data.
 * W2-L5 Tame It: the degree is fixed and high; a regularization slider tames it instead.
 * W2-L6 Unfair Data: a straight border on imbalanced data; an oversampling slider rebalances it.
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
  const oversample = scene.oversample
  const focus = focusOf(scene)
  const resultText = result ? describeResult(result, focus) : null

  return (
    <LevelFrame
      game={game}
      world={world}
      level={level}
      resultText={resultText}
      describeNext={describeNext(focus)}
      visual={
        <div className={styles['visualStack']}>
          <RegionMap
            points={scene.points}
            view={scene.view}
            regions={trained?.regions ?? null}
            boundary={trained?.boundary ?? []}
            checked={snapshot.checked}
            class1Weight={snapshot.oversample}
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
              {...(regularization || oversample
                ? {}
                : { actionLabel: t('level.train'), action: { type: 'train' } })}
              disabled={false}
              onCommand={game.dispatch}
            />
          ) : null}
          {focus === 'minority' ? null : (
            <p className={styles['stats']}>
              {scene.degree
                ? t('level.complexity.terms', { count: polynomialTermCount(snapshot.degree) })
                : t('level.complexity.fixed', {
                    degree: snapshot.degree,
                    count: polynomialTermCount(snapshot.degree),
                  })}
            </p>
          )}
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
          {oversample ? (
            <HyperparameterControls
              name="oversample"
              label={t('level.oversample.label')}
              hint={t('level.oversample.hint')}
              value={snapshot.oversample}
              min={oversample.min}
              max={oversample.max}
              step={oversample.step}
              actionLabel={t('level.train')}
              action={{ type: 'train' }}
              disabled={false}
              onCommand={game.dispatch}
            />
          ) : null}
          <p className={styles['mission']} aria-live="polite">
            {!trained
              ? t('level.complexity.none')
              : focus === 'minority'
                ? t('level.oversample.trained', {
                    found: trained.perClass[1].correct,
                    minority: trained.perClass[1].total,
                    right: trained.perClass[0].correct,
                    majority: trained.perClass[0].total,
                  })
                : t('level.complexity.trained', {
                    degree: trained.degree,
                    correct: trained.correct,
                    total: trained.total,
                  })}
          </p>
          <Button variant="primary" onClick={() => game.dispatch({ type: 'check' })}>
            {t('level.complexity.check')}
          </Button>
        </>
      }
    />
  )
}
