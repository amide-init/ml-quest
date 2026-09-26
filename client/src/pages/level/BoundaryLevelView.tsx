import { Button } from '@/components/ui'
import { BoundaryPlot } from '@/components/widgets'
import type { UseLevelSession } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import type { BoundaryScene, BoundarySnapshot, ConditionFailure } from '@/models'
import { LevelFrame } from './LevelFrame'
import styles from './LevelFrame.module.css'

interface BoundaryLevelViewProps {
  readonly game: UseLevelSession
  readonly scene: BoundaryScene
  readonly snapshot: BoundarySnapshot
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

/** World 2 boundary levels (Split the Kingdom): place the border, swap sides if needed, check. */
export function BoundaryLevelView({ game, scene, snapshot, world, level }: BoundaryLevelViewProps) {
  const playing = game.view.session.phase === 'playing'
  const result = game.view.session.lastResult
  const pass = game.view.level.stars.pass
  const target = 'metric' in pass ? percent(pass.value) : 0

  const resultText = result
    ? result.passed
      ? {
          title: t('level.result.boundary.passed.title'),
          body: t('level.result.boundary.passed.body', {
            accuracy: percent(result.metrics.accuracy),
          }),
        }
      : {
          title: t('level.result.boundary.failed.title'),
          body: t('level.result.boundary.failed.body', {
            accuracy: percent(result.metrics.accuracy),
            target,
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
        <BoundaryPlot
          scene={scene}
          p={snapshot.p}
          q={snapshot.q}
          flipped={snapshot.flipped}
          disabled={!playing}
          onCommand={game.dispatch}
        />
      }
      controls={
        <>
          <p className={styles['stats']} aria-live="polite">
            {t('level.boundary.correct', { correct: snapshot.correct, total: snapshot.total })}
          </p>
          <Button onClick={() => game.dispatch({ type: 'flip-sides' })}>
            {t('level.boundary.swap')}
          </Button>
          <Button variant="primary" onClick={() => game.dispatch({ type: 'check' })}>
            {t('level.boundary.check')}
          </Button>
        </>
      }
    />
  )
}
