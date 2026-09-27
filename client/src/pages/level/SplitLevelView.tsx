import { useState } from 'react'
import { Button } from '@/components/ui'
import { TreeDiagram } from '@/components/viz'
import { SplitPlot } from '@/components/widgets'
import type { UseLevelSession } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import type { ConditionFailure, EvalResult, SplitScene, SplitSnapshot } from '@/models'
import { LevelFrame } from './LevelFrame'
import styles from './LevelFrame.module.css'

interface SplitLevelViewProps {
  readonly game: UseLevelSession
  readonly scene: SplitScene
  readonly snapshot: SplitSnapshot
  readonly world: number
  readonly level: number
}

const percent = (share: number) => Math.round(share * 100)
const round = (value: number) => Math.round(value * 100) / 100

function describeResult(result: EvalResult) {
  const values = {
    test: percent(result.metrics.test_accuracy),
    train: percent(result.metrics.accuracy),
  }
  if (result.passed) {
    return {
      title: t('level.result.splits.passed.title'),
      body: t('level.result.splits.passed.body', values),
    }
  }
  const failure = result.failedConditions[0]
  return {
    title: t('level.result.splits.failed.title'),
    body: t('level.result.splits.failed.body', {
      ...values,
      target: percent(failure?.expected ?? Number.NaN),
    }),
  }
}

const describeNext = (condition: ConditionFailure) => {
  switch (condition.metric) {
    case 'attempt':
      return condition.expected <= 1
        ? t('level.result.next.attempt.overfitter')
        : t('level.result.next.attempt.within', { value: condition.expected })
    case 'test_accuracy':
      return t('level.result.next.test_accuracy.splits', { value: percent(condition.expected) })
    default:
      return t(`level.result.next.${condition.metric}` as MessageKey, { value: condition.expected })
  }
}

/**
 * World 3, levels 1–3: build a decision tree by hand. Choose a region, ask a question about cap
 * width or stem height, move the cut, and check the tree on new mushrooms.
 */
export function SplitLevelView({ game, scene, snapshot, world, level }: SplitLevelViewProps) {
  const [chosen, setChosen] = useState<string | null>(null)
  const playing = game.view.session.phase === 'playing'
  // With no questions yet there is one region to split: pick it for the player.
  const selectedLeaf =
    snapshot.leaves.length === 1
      ? snapshot.leaves[0]
      : snapshot.leaves.find((leaf) => leaf.path === chosen)
  const used = snapshot.splits.length
  const canSplit = Boolean(selectedLeaf) && used < scene.maxSplits
  const last = snapshot.splits.at(-1)
  const result = game.view.session.lastResult

  const addSplit = (axis: 0 | 1) => {
    if (!selectedLeaf) return
    const { xMin, xMax, yMin, yMax } = selectedLeaf.bounds
    const middle = axis === 0 ? (xMin + xMax) / 2 : (yMin + yMax) / 2
    game.dispatch({ type: 'add-split', leaf: selectedLeaf.path, axis, threshold: round(middle) })
    setChosen(null)
  }

  return (
    <LevelFrame
      game={game}
      world={world}
      level={level}
      resultText={result ? describeResult(result) : null}
      describeNext={describeNext}
      visual={
        <div className={styles['visualStack']}>
          <SplitPlot
            scene={scene}
            splits={snapshot.splits}
            leaves={snapshot.leaves}
            checked={snapshot.checked}
            selected={selectedLeaf?.path ?? null}
            onSelect={setChosen}
            disabled={!playing}
            onCommand={game.dispatch}
          />
          {snapshot.checked ? (
            <p className={styles['mission']}>
              {t('level.splits.checked', {
                total: snapshot.checked.length,
                wrong: snapshot.checked.filter((point) => !point.correct).length,
              })}
            </p>
          ) : null}
          <TreeDiagram tree={snapshot.tree} showImpurity={scene.showImpurity} />
        </div>
      }
      controls={
        <>
          <p className={styles['stats']}>
            {t('level.splits.used', { used, max: scene.maxSplits })}
          </p>
          <p className={styles['mission']}>
            {used >= scene.maxSplits
              ? t('level.splits.full')
              : selectedLeaf
                ? t('level.splits.selected', {
                    safe: selectedLeaf.counts[1],
                    poisonous: selectedLeaf.counts[0],
                  })
                : t('level.splits.pick')}
          </p>
          <div className={styles['buttonRow']}>
            <Button disabled={!canSplit} onClick={() => addSplit(0)}>
              {t('level.splits.byX1')}
            </Button>
            <Button disabled={!canSplit} onClick={() => addSplit(1)}>
              {t('level.splits.byX2')}
            </Button>
          </div>
          <div className={styles['buttonRow']}>
            <Button
              size="small"
              disabled={!last}
              onClick={() => last && game.dispatch({ type: 'remove-split', node: last.path })}
            >
              {t('level.splits.undo')}
            </Button>
          </div>
          <p className={styles['mission']} aria-live="polite">
            {t('level.splits.training', { correct: snapshot.correct, total: snapshot.total })}
            {scene.showImpurity
              ? ` ${t('level.splits.impurity', { value: snapshot.impurity.toFixed(2) })}`
              : ''}
          </p>
          <Button variant="primary" onClick={() => game.dispatch({ type: 'check' })}>
            {t('level.splits.check')}
          </Button>
        </>
      }
    />
  )
}
