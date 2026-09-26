import { Button } from '@/components/ui'
import { SigmoidPlot } from '@/components/viz'
import { HyperparameterControls } from '@/components/widgets'
import type { UseLevelSession } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import type { ConditionFailure, SigmoidScene, SigmoidSnapshot } from '@/models'
import { LevelFrame } from './LevelFrame'
import styles from './LevelFrame.module.css'

interface SigmoidLevelViewProps {
  readonly game: UseLevelSession
  readonly scene: SigmoidScene
  readonly snapshot: SigmoidSnapshot
  readonly world: number
  readonly level: number
}

const percent = (share: number) => Math.round(share * 100)

const describeNext = (condition: ConditionFailure) =>
  condition.metric === 'test_loss'
    ? t('level.result.next.test_loss.sigmoid')
    : t(`level.result.next.${condition.metric}` as MessageKey, {
        value:
          condition.metric === 'min_confidence'
            ? `${percent(condition.expected)}%`
            : condition.expected,
      })

/** W2-L2 Confidence: tune the sigmoid's threshold and slope until every point is confidently right. */
export function SigmoidLevelView({ game, scene, snapshot, world, level }: SigmoidLevelViewProps) {
  const result = game.view.session.lastResult
  const confidence = percent(snapshot.minConfidence)

  const resultText = result
    ? result.passed
      ? {
          title: t('level.result.sigmoid.passed.title'),
          body: t('level.result.sigmoid.passed.body', { confidence }),
        }
      : {
          title: t('level.result.sigmoid.failed.title'),
          body: t('level.result.sigmoid.failed.body', { confidence }),
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
        <SigmoidPlot
          points={scene.points}
          confidences={snapshot.confidences}
          slope={snapshot.slope}
          threshold={snapshot.threshold}
          xMin={scene.xMin}
          xMax={scene.xMax}
        />
      }
      controls={
        <>
          <p className={styles['stats']} aria-live="polite">
            {t('level.sigmoid.weakest', { confidence })}
          </p>
          <HyperparameterControls
            name="threshold"
            label={t('level.sigmoid.threshold')}
            hint={t('level.sigmoid.threshold.hint')}
            value={snapshot.threshold}
            min={scene.threshold.min}
            max={scene.threshold.max}
            step={scene.threshold.step}
            disabled={false}
            onCommand={game.dispatch}
          />
          <HyperparameterControls
            name="slope"
            label={t('level.sigmoid.slope')}
            hint={t('level.sigmoid.slope.hint')}
            value={snapshot.slope}
            min={scene.slope.min}
            max={scene.slope.max}
            step={scene.slope.step}
            disabled={false}
            onCommand={game.dispatch}
          />
          <Button variant="primary" onClick={() => game.dispatch({ type: 'check' })}>
            {t('level.sigmoid.check')}
          </Button>
        </>
      }
    />
  )
}
