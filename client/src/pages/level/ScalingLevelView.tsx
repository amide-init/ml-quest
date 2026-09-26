import { Switch } from '@/components/ui'
import { FeatureRanges, LossCurve } from '@/components/viz'
import { HyperparameterControls } from '@/components/widgets'
import { usePlayback, usePrefersReducedMotion, type UseLevelSession } from '@/hooks'
import { t } from '@/i18n'
import type { ScalingScene, ScalingSnapshot } from '@/models'
import { LevelFrame } from './LevelFrame'
import styles from './TrainingLevelView.module.css'

const replayDuration = (epochs: number) => Math.min(2400, Math.max(900, epochs * 30))

interface ScalingLevelViewProps {
  readonly game: UseLevelSession
  readonly scene: ScalingScene
  readonly snapshot: ScalingSnapshot
  readonly world: number
  readonly level: number
}

/** W1-L7 Scale Matters: scale the features (or not), pick a learning rate, beat the unscaled baseline. */
export function ScalingLevelView({ game, scene, snapshot, world, level }: ScalingLevelViewProps) {
  const reducedMotion = usePrefersReducedMotion()
  const run = snapshot.run
  const lastEpoch = run ? run.losses.length - 1 : 0
  const epoch = usePlayback(run, lastEpoch, replayDuration(lastEpoch), reducedMotion)
  const replayDone = !run || epoch >= lastEpoch
  const result = game.view.session.lastResult
  const baseline = scene.baseline.epochs
  const speedup = result ? result.metrics.speedup.toFixed(1) : ''

  const resultText =
    result && run && replayDone
      ? run.status === 'diverged'
        ? {
            title: t('level.result.scaling.diverged.title'),
            body: t('level.result.scaling.diverged.body', {
              rate: run.learningRate.toFixed(3),
              scaled: run.scaled ? '' : t('level.result.scaling.diverged.unscaled'),
            }),
          }
        : run.convergedAt === null
          ? {
              title: t('level.result.scaling.unconverged.title'),
              body: t('level.result.scaling.unconverged.body', { max: scene.maxEpochs }),
            }
          : result.passed
            ? {
                title: t('level.result.scaling.passed.title', { speedup }),
                body: t('level.result.scaling.passed.body', { epochs: run.convergedAt, baseline }),
              }
            : {
                title: t('level.result.scaling.slow.title', { speedup }),
                body: t('level.result.scaling.slow.body', { epochs: run.convergedAt, baseline }),
              }
      : null

  return (
    <LevelFrame
      game={game}
      world={world}
      level={level}
      resultText={resultText}
      pending={
        <p className={styles['status']} aria-live="polite">
          {t('level.training.progress', { epoch, total: lastEpoch })}
        </p>
      }
      visual={
        <div className={styles['visual']}>
          <FeatureRanges features={scene.features} scaled={run ? run.scaled : snapshot.scaled} />
          <LossCurve
            losses={run ? run.losses : null}
            shownEpochs={epoch}
            maxEpochs={scene.maxEpochs}
            targetLoss={scene.targetLoss}
            initialLoss={scene.initialLoss}
            baseline={scene.baseline.losses}
            logEpochs
            legend={{
              baseline: t('level.scaling.legend.baseline'),
              run: t('level.scaling.legend.yours'),
            }}
          />
        </div>
      }
      controls={
        <>
          <p className={styles['status']}>
            {t('level.scaling.baseline', {
              epochs: baseline,
              rate: scene.baseline.learningRate.toFixed(3),
            })}
          </p>
          <Switch
            label={t('level.scaling.toggle')}
            hint={t('level.scaling.toggle.hint')}
            checked={snapshot.scaled}
            onChange={(enabled) => game.dispatch({ type: 'set-scaling', enabled })}
          />
          <HyperparameterControls
            name="learningRate"
            label={t('level.learningRate.label')}
            hint={t('level.learningRate.hint')}
            value={snapshot.learningRate}
            min={scene.learningRate.min}
            max={scene.learningRate.max}
            step={scene.learningRate.step}
            actionLabel={t('level.train')}
            action={{ type: 'train' }}
            disabled={false}
            onCommand={game.dispatch}
          />
        </>
      }
    />
  )
}
