import { LevelStats } from '@/components/game'
import { LossLandscapeMap } from '@/components/viz'
import { StepControls } from '@/components/widgets'
import type { UseLevelSession } from '@/hooks'
import { t } from '@/i18n'
import type { LandscapeMap, LandscapeSnapshot } from '@/models'
import { LevelFrame } from './LevelFrame'

interface LandscapeLevelViewProps {
  readonly game: UseLevelSession
  readonly scene: LandscapeMap
  readonly snapshot: LandscapeSnapshot
  readonly world: number
  readonly level: number
}

/** World 1 descent levels (Roll Downhill): a contour map, a step-size slider and a Step button. */
export function LandscapeLevelView({
  game,
  scene,
  snapshot,
  world,
  level,
}: LandscapeLevelViewProps) {
  const result = game.view.session.lastResult
  const diverged = snapshot.status === 'diverged'

  const resultText = result
    ? result.passed
      ? {
          title: t('level.result.passed.title'),
          body: t('level.result.passed.body', { steps: result.metrics.steps }),
        }
      : diverged
        ? { title: t('level.result.diverged.title'), body: t('level.result.diverged.body') }
        : {
            title: t('level.result.budget.title'),
            body: t('level.result.budget.body', {
              steps: result.metrics.steps,
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
      visual={
        <LossLandscapeMap
          map={scene}
          snapshot={snapshot}
          showPreview={game.view.session.phase === 'playing'}
          label={t('level.map.description', { loss: snapshot.loss.toFixed(3) })}
        />
      }
      controls={
        <>
          <LevelStats steps={snapshot.steps} budget={scene.stepBudget} loss={snapshot.loss} />
          <StepControls
            learningRate={snapshot.learningRate}
            min={scene.learningRate.min}
            max={scene.learningRate.max}
            step={scene.learningRate.step}
            disabled={false}
            onCommand={game.dispatch}
          />
        </>
      }
    />
  )
}
