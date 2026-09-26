import { LossMeter } from '@/components/game'
import { Button } from '@/components/ui'
import { LineFitPlot } from '@/components/widgets'
import type { UseLevelSession } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import type { RegressionScene, RegressionSnapshot } from '@/models'
import { LevelFrame } from './LevelFrame'
import styles from './LevelFrame.module.css'

interface RegressionLevelViewProps {
  readonly game: UseLevelSession
  readonly scene: RegressionScene
  readonly snapshot: RegressionSnapshot
  readonly world: number
  readonly level: number
}

const format = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2))

/** World 1 line-fitting levels (Draw the Line, Feel the Loss): drag the line, then check it. */
export function RegressionLevelView({
  game,
  scene,
  snapshot,
  world,
  level,
}: RegressionLevelViewProps) {
  const playing = game.view.session.phase === 'playing'
  const result = game.view.session.lastResult
  const failure = result?.failedConditions[0]

  const resultText = result
    ? result.passed
      ? {
          title: t('level.result.fit.passed.title'),
          body: t('level.result.fit.passed.body', { loss: result.metrics.final_loss.toFixed(2) }),
        }
      : {
          title: t('level.result.fit.failed.title'),
          body: failure
            ? t(`level.result.fail.${failure.metric}` as MessageKey, {
                actual: format(failure.actual),
                expected: format(failure.expected),
              })
            : '',
        }
    : null

  return (
    <LevelFrame
      game={game}
      world={world}
      level={level}
      resultText={resultText}
      visual={
        <LineFitPlot
          scene={scene}
          w={snapshot.w}
          b={snapshot.b}
          disabled={!playing}
          onCommand={game.dispatch}
        />
      }
      controls={
        <>
          {scene.showLoss ? (
            <LossMeter
              loss={snapshot.loss}
              bestLoss={snapshot.bestLoss}
              scale={scene.initialLoss}
            />
          ) : null}
          {scene.moveBudget !== null ? (
            <p className={styles['stats']}>
              {t('level.moves', { used: snapshot.moves, budget: scene.moveBudget })}
            </p>
          ) : null}
          <Button variant="primary" onClick={() => game.dispatch({ type: 'check' })}>
            {t('level.check')}
          </Button>
        </>
      }
    />
  )
}
