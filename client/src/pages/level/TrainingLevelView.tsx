import { Switch } from '@/components/ui'
import { LossCurve } from '@/components/viz'
import { HyperparameterControls, LineFitPlot } from '@/components/widgets'
import { usePlayback, usePrefersReducedMotion, type UseLevelSession } from '@/hooks'
import { t } from '@/i18n'
import type { EvalResult, TrainingRun, TrainingScene, TrainingSnapshot } from '@/models'
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

/** The result in this level's vocabulary. The failed condition decides what went wrong. */
function describeResult(result: EvalResult, run: TrainingRun) {
  const rate = run.learningRate.toFixed(2)
  const epochs = run.convergedAt ?? run.epochs.length - 1
  if (run.status === 'diverged') {
    return {
      title: t('level.result.train.diverged.title'),
      body: t('level.result.train.diverged.body', { rate }),
    }
  }
  if (run.status === 'too-slow') {
    return {
      title: t('level.result.train.slow.title'),
      body: t('level.result.train.slow.body', {
        rate,
        epochs,
        gap: result.metrics.loss_gap.toFixed(2),
      }),
    }
  }
  if (result.passed) {
    return {
      title: t('level.result.train.converged.title'),
      body: t('level.result.train.converged.body', { rate, epochs }),
    }
  }
  const failure = result.failedConditions[0]
  if (failure?.metric === 'test_loss') {
    return {
      title: t('level.result.train.misfit.title'),
      body: t('level.result.train.misfit.body', {
        test: failure.actual.toFixed(2),
        target: failure.expected,
      }),
    }
  }
  // Converged, but over the epoch budget. "< 50" means the budget is 49 epochs.
  const limit = failure ? (failure.op === '<' ? failure.expected - 1 : failure.expected) : epochs
  return {
    title: t('level.result.train.overbudget.title'),
    body: t('level.result.train.overbudget.body', { rate, epochs, limit }),
  }
}

/**
 * Gradient-descent levels: pick a learning rate, press Train, watch the run replay epoch by epoch
 * (W1-L4). The W1-L8 boss also lets the player remove points and scale the feature first.
 */
export function TrainingLevelView({ game, scene, snapshot, world, level }: TrainingLevelViewProps) {
  const reducedMotion = usePrefersReducedMotion()
  const run = snapshot.run
  const lastEpoch = run ? run.epochs.length - 1 : 0
  const epoch = usePlayback(run, lastEpoch, replayDuration(lastEpoch), reducedMotion)
  const replayDone = !run || epoch >= lastEpoch
  const playing = game.view.session.phase === 'playing'

  const shown = run?.epochs[Math.min(epoch, lastEpoch)] ?? snapshot.initial
  const result = game.view.session.lastResult
  const resultText = result && run && replayDone ? describeResult(result, run) : null

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
            disabled={!playing}
            readOnly
            removed={snapshot.removed}
            {...(scene.allowCleaning && playing
              ? { onTogglePoint: (index: number) => game.dispatch({ type: 'toggle-point', index }) }
              : {})}
            onCommand={game.dispatch}
          />
          <LossCurve
            losses={run ? run.epochs.map((recorded) => recorded.loss) : null}
            shownEpochs={epoch}
            maxEpochs={scene.maxEpochs}
            targetLoss={snapshot.targetLoss}
            initialLoss={scene.initialLoss}
          />
        </div>
      }
      controls={
        <>
          {scene.allowCleaning ? (
            <p className={styles['note']}>{t('level.training.cleaning')}</p>
          ) : null}
          {scene.allowScaling ? (
            <Switch
              label={t('level.training.scale')}
              hint={t('level.training.scale.hint')}
              checked={snapshot.scaled}
              onChange={(enabled) => game.dispatch({ type: 'set-scaling', enabled })}
            />
          ) : null}
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
