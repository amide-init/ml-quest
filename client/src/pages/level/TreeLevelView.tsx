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

type Focus = 'depth' | 'pruning' | 'variance' | 'forest'

const focusOf = (scene: TreeScene): Focus =>
  scene.resamples !== null
    ? 'variance'
    : scene.trees
      ? 'forest'
      : scene.minLeaf
        ? 'pruning'
        : 'depth'

/** Each level talks about its own lesson: depth, pruning (the gap), variance, or the forest. */
function describeResult(result: EvalResult, focus: Focus, trees: number) {
  const { accuracy, test_accuracy: test, accuracy_gap: gap, leaf_count: leaves } = result.metrics
  const pruning = focus === 'pruning'
  const target = result.failedConditions.find((condition) => condition.metric === 'test_accuracy')
  const values = {
    train: percent(accuracy),
    test: percent(test),
    gap: percent(gap),
    leaves,
    trees,
    disagreement: percent(result.metrics.instability),
    target: percent(target?.expected ?? 0.8),
  }
  if (focus === 'variance') {
    const shaky = result.metrics.instability > 0.08
    const key = result.passed
      ? 'level.result.tree.steady'
      : shaky
        ? 'level.result.tree.shaky'
        : 'level.result.tree.simple'
    return { title: t(`${key}.title` as MessageKey), body: t(`${key}.body` as MessageKey, values) }
  }
  if (focus === 'forest') {
    const key = result.passed ? 'level.result.tree.forest' : 'level.result.tree.fewTrees'
    return { title: t(`${key}.title` as MessageKey), body: t(`${key}.body` as MessageKey, values) }
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
    case 'test_accuracy':
      return t('level.result.next.test_accuracy.splits', { value: percent(condition.expected) })
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
  const focus = focusOf(scene)
  // One Train button, on the last slider that changes the model.
  const trainsOn = scene.trees ? 'trees' : scene.minLeaf ? 'minLeaf' : 'maxDepth'
  const train = (name: string) =>
    name === trainsOn ? { actionLabel: t('level.train'), action: { type: 'train' } as const } : {}

  return (
    <LevelFrame
      game={game}
      world={world}
      level={level}
      resultText={result ? describeResult(result, focus, snapshot.trees) : null}
      describeNext={describeNext}
      visual={
        <div className={styles['visualStack']}>
          <RegionMap
            points={scene.points}
            view={scene.view}
            regions={trained?.regions ?? null}
            boundary={trained?.boundary ?? []}
            leaves={trained && trained.leaves.length > 0 ? trained.leaves : null}
            ghostBorders={trained?.ghosts ?? []}
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
          {trained && focus !== 'forest' ? (
            <TreeDiagram tree={trained.tree} showImpurity={false} />
          ) : null}
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
              {...train('maxDepth')}
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
              {...train('minLeaf')}
              disabled={false}
              onCommand={game.dispatch}
            />
          ) : null}
          {scene.trees ? (
            <HyperparameterControls
              name="trees"
              label={t('level.tree.trees.label')}
              hint={t('level.tree.trees.hint')}
              value={snapshot.trees}
              min={scene.trees.min}
              max={scene.trees.max}
              step={scene.trees.step}
              {...train('trees')}
              disabled={false}
              onCommand={game.dispatch}
            />
          ) : null}
          {trained && trained.disagreement !== null ? (
            <p className={styles['stats']} aria-live="polite">
              {t('level.tree.disagreement', {
                count: scene.resamples ?? 0,
                value: percent(trained.disagreement),
              })}
            </p>
          ) : null}
          <p className={styles['mission']} aria-live="polite">
            {trained && focus === 'forest'
              ? t('level.tree.forest', {
                  trees: trained.trees,
                  depth: trained.maxDepth,
                  correct: trained.correct,
                  total: trained.total,
                })
              : trained
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
