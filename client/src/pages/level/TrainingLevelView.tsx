import { LossCurve } from '@/components/viz'
import { HyperparameterControls, LineFitPlot } from '@/components/widgets'
import { usePlayback, usePrefersReducedMotion, type UseLevelSession } from '@/hooks'
import { t } from '@/i18n'
import type { TrainingScene, TrainingSnapshot } from '@/models'
import { LevelFrame } from './LevelFrame'
import styles from './TrainingLevelView.module.css'

/** Replay length: short runs play slower so each epoch is visible; long runs are capped. */
const replayDuration = (epochs: number) => Math.min(2400, Math.max(900, epochs * 80))

interface TrainingLevelViewProps {
  readonly game: UseLevelSession
  readonly scene: TrainingScene
  readonly snapshot: TrainingSnapshot
  readonly world: number
  readonly level: number
}

/** W1-L4 Too Fast, Too Slow: pick a learning rate, press Train, watch the run replay epoch by epoch. */
export function TrainingLevelView({ game, scene, snapshot, world, level }: TrainingLevelViewProps) {
  const reducedMotion = usePrefersReducedMotion()
  const run = snapshot.run
  const lastEpoch = run ? run.epochs.length - 1 : 0
  const epoch = usePlayback(run, lastEpoch, replayDuration(lastEpoch), reducedMotion)
  const replayDone = !run || epoch >= lastEpoch

  const shown = run?.epochs[Math.min(epoch, lastEpoch)] ?? snapshot.initial
  const result = game.view.session.lastResult
  const rate = run?.learningRate.toFixed(2) ?? ''

  const resultText =
    result && run && replayDone
      ? run.status === 'converged' && result.passed
        ? {
            title: t('level.result.train.converged.title'),
            body: t('level.result.train.converged.body', {
              rate,
              epochs: run.convergedAt ?? lastEpoch,
            }),
          }
        : run.status === 'converged'
          ? {
              title: t('level.result.train.bouncing.title'),
              body: t('level.result.train.bouncing.body', {
                rate,
                epochs: run.convergedAt ?? lastEpoch,
              }),
            }
          : run.status === 'diverged'
            ? {
                title: t('level.result.train.diverged.title'),
                body: t('level.result.train.diverged.body', { rate }),
              }
            : {
                title: t('level.result.train.slow.title'),
                body: t('level.result.train.slow.body', {
                  rate,
                  epochs: lastEpoch,
                  gap: result.metrics.loss_gap.toFixed(2),
                }),
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
          <LineFitPlot
            scene={scene}
            w={shown.w}
            b={shown.b}
            disabled
            readOnly
            onCommand={game.dispatch}
          />
          <LossCurve
            losses={run ? run.epochs.map((recorded) => recorded.loss) : null}
            shownEpochs={epoch}
            maxEpochs={scene.maxEpochs}
            targetLoss={scene.targetLoss}
            initialLoss={scene.initialLoss}
          />
        </div>
      }
      controls={
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
      }
    />
  )
}
