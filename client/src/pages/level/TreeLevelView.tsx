import { Button } from '@/components/ui'
import { RegionMap, TreeDiagram } from '@/components/viz'
import { HyperparameterControls } from '@/components/widgets'
import type { UseLevelSession } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import type { ConditionFailure, EvalResult, TreeScene, TreeSnapshot } from '@/models'
import { LevelFrame } from './LevelFrame'
import styles from './LevelFrame.module.css'

interface TreeLevelViewProps {
  readonly game: UseLevelSession
  readonly scene: TreeScene
  readonly snapshot: TreeSnapshot
  readonly world: number
  readonly level: number
}

const percent = (share: number) => Math.round(share * 100)

/** W3-L5 (leaf-size slider) talks about the train/new gap; W3-L4 about new mushrooms alone. */
function describeResult(result: EvalResult, pruning: boolean) {
  const { accuracy, test_accuracy: test, accuracy_gap: gap, leaf_count: leaves } = result.metrics
  const target = result.failedConditions.find((condition) => condition.metric === 'test_accuracy')
  const values = {
    train: percent(accuracy),
    test: percent(test),
    gap: percent(gap),
    leaves,
    target: percent(target?.expected ?? 0.8),
  }
  if (result.passed) {
    const key = pruning ? 'level.result.tree.pruned' : 'level.result.tree.passed'
    return { title: t(`${key}.title` as MessageKey), body: t(`${key}.body` as MessageKey, values) }
  }
  // Far ahead on training = memorizing; otherwise the tree is too simple to see the pattern.
  if (accuracy - test >= 0.05) {
    return {
      title: t('level.result.tree.overgrown.title'),
      body: t(
        pruning ? 'level.result.tree.overgrown.gap' : 'level.result.tree.overgrown.body',
        values,
      ),
    }
  }
  return {
    title: t('level.result.tree.simple.title'),
    body: t('level.result.tree.simple.body', values),
  }
}

const describeNext = (condition: ConditionFailure) => {
  switch (condition.metric) {
    case 'attempt':
      return condition.expected <= 1
        ? t('level.result.next.attempt.overfitter')
        : t('level.result.next.attempt.within', { value: condition.expected })
    case 'leaf_count':
      return t('level.result.next.leaf_count', { value: condition.expected })
    default:
      return t(`level.result.next.${condition.metric}` as MessageKey, { value: condition.expected })
  }
}

/**
 * World 3 from level 4: the machine grows the tree; the player limits it. Train shows its boxes
 * and training score; Check judges it on new mushrooms and reveals them.
 */
export function TreeLevelView({ game, scene, snapshot, world, level }: TreeLevelViewProps) {
  const result = game.view.session.lastResult
  const trained = snapshot.trained
  const pruning = scene.minLeaf !== null
  const train = { actionLabel: t('level.train'), action: { type: 'train' } as const }

  return (
    <LevelFrame
      game={game}
      world={world}
      level={level}
      resultText={result ? describeResult(result, pruning) : null}
      describeNext={describeNext}
      visual={
        <div className={styles['visualStack']}>
          <RegionMap
            points={scene.points}
            view={scene.view}
            regions={null}
            boundary={[]}
            leaves={trained?.leaves ?? null}
            checked={snapshot.checked}
          />
          {snapshot.checked ? (
            <p className={styles['mission']}>
              {t('level.splits.checked', {
                total: snapshot.checked.length,
                wrong: snapshot.checked.filter((point) => !point.correct).length,
              })}
            </p>
          ) : null}
          {trained ? <TreeDiagram tree={trained.tree} showImpurity={false} /> : null}
        </div>
      }
      controls={
        <>
          {scene.maxDepth ? (
            <HyperparameterControls
              name="maxDepth"
              label={t('level.tree.depth.label')}
              hint={t('level.tree.depth.hint')}
              value={snapshot.maxDepth}
              min={scene.maxDepth.min}
              max={scene.maxDepth.max}
              step={scene.maxDepth.step}
              {...(pruning ? {} : train)}
              disabled={false}
              onCommand={game.dispatch}
            />
          ) : (
            <p className={styles['stats']}>
              {t('level.tree.depth.fixed', { depth: snapshot.maxDepth })}
            </p>
          )}
          {scene.minLeaf ? (
            <HyperparameterControls
              name="minLeaf"
              label={t('level.tree.leaf.label')}
              hint={t('level.tree.leaf.hint')}
              value={snapshot.minLeaf}
              min={scene.minLeaf.min}
              max={scene.minLeaf.max}
              step={scene.minLeaf.step}
              {...train}
              disabled={false}
              onCommand={game.dispatch}
            />
          ) : null}
          <p className={styles['mission']} aria-live="polite">
            {trained
              ? t('level.tree.trained', {
                  leaves: trained.leafCount,
                  depth: trained.depth,
                  correct: trained.correct,
                  total: trained.total,
                })
              : t('level.tree.none')}
          </p>
          <Button variant="primary" onClick={() => game.dispatch({ type: 'check' })}>
            {t('level.splits.check')}
          </Button>
        </>
      }
    />
  )
}
