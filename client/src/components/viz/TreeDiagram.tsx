import { t } from '@/i18n'
import type { TreeNode } from '@/models'
import styles from './TreeDiagram.module.css'

interface TreeDiagramProps {
  readonly tree: TreeNode
  /** Show each leaf's Gini impurity (W3-L3). */
  readonly showImpurity: boolean
  /** Questions deeper than this are summarised, so big trees stay readable. */
  readonly maxDepth?: number
}

const splitsIn = (node: TreeNode): number =>
  node.kind === 'leaf' ? 0 : 1 + splitsIn(node.left) + splitsIn(node.right)

const giniOf = ([poisonous, safe]: readonly [number, number]) => {
  const total = poisonous + safe
  return total === 0 ? 0 : 1 - (poisonous / total) ** 2 - (safe / total) ** 2
}

function Leaf({
  counts,
  showImpurity,
}: {
  counts: readonly [number, number]
  showImpurity: boolean
}) {
  const [poisonous, safe] = counts
  const verdict =
    safe > poisonous
      ? t('level.tree.class1')
      : poisonous > safe
        ? t('level.tree.class0')
        : t('level.tree.tied')
  return (
    <div
      className={[styles['leaf'], safe > poisonous ? styles['leaf1'] : styles['leaf0']].join(' ')}
    >
      <strong>{verdict}</strong>{' '}
      <span className={styles['counts']}>
        {t('level.tree.counts', { safe, poisonous })}
        {showImpurity ? ` · ${t('level.tree.gini', { value: giniOf(counts).toFixed(2) })}` : ''}
      </span>
    </div>
  )
}

function Node({
  node,
  depth,
  maxDepth,
  showImpurity,
}: {
  node: TreeNode
  depth: number
  maxDepth: number
  showImpurity: boolean
}) {
  if (node.kind === 'leaf') return <Leaf counts={node.counts} showImpurity={showImpurity} />
  if (depth >= maxDepth) {
    return <div className={styles['more']}>{t('level.tree.more', { count: splitsIn(node) })}</div>
  }
  const feature = t(node.feature === 0 ? 'level.tree.x1' : 'level.tree.x2')
  return (
    <>
      <div className={styles['question']}>
        {t('level.tree.question', { feature, value: node.threshold.toFixed(1) })}
      </div>
      <ul className={styles['branches']}>
        {(
          [
            ['level.tree.yes', node.left],
            ['level.tree.no', node.right],
          ] as const
        ).map(([label, child]) => (
          <li key={label} className={styles['branch']}>
            <span className={styles['answer']}>{t(label)}</span>
            <Node node={child} depth={depth + 1} maxDepth={maxDepth} showImpurity={showImpurity} />
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * A decision tree as the questions it asks (World 3). Built from nested lists, so screen readers
 * announce its structure, and it fits a narrow column.
 */
export function TreeDiagram({ tree, showImpurity, maxDepth = 3 }: TreeDiagramProps) {
  return (
    <figure className={styles['diagram']}>
      <figcaption className={styles['caption']}>{t('level.tree.caption')}</figcaption>
      <div className={styles['root']}>
        <Node node={tree} depth={0} maxDepth={maxDepth} showImpurity={showImpurity} />
      </div>
    </figure>
  )
}
