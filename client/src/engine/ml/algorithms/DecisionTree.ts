import type { Rng, TabularData, TreeLeaf, TreeNode } from '@/models'

export interface TreeOptions {
  /** 0 = a single leaf (predict the majority). */
  readonly maxDepth: number
  /** A split is only allowed if both sides keep at least this many points. */
  readonly minSamplesLeaf: number
  /** Consider only this many randomly chosen features at each split (random forests). */
  readonly featuresPerSplit?: number
  /** Required with featuresPerSplit. */
  readonly rng?: Rng
}

/** Gini impurity of class counts: 0 when pure, 0.5 when evenly mixed (two classes). */
export function gini(counts: readonly [number, number]): number {
  const total = counts[0] + counts[1]
  if (total === 0) return 0
  const p = counts[1] / total
  return 2 * p * (1 - p)
}

const countsOf = (data: TabularData, rows: readonly number[]): [number, number] => {
  const counts: [number, number] = [0, 0]
  for (const row of rows) counts[data.y[row] === 1 ? 1 : 0] += 1
  return counts
}

interface Split {
  readonly feature: number
  readonly threshold: number
  readonly impurity: number
}

/**
 * The split with the lowest weighted Gini impurity, or null when none improves the node.
 * Thresholds sit halfway between neighbouring values; ties keep the first feature and the lowest
 * threshold, so the same data always grows the same tree.
 */
function bestSplit(
  data: TabularData,
  rows: readonly number[],
  features: readonly number[],
  minSamplesLeaf: number,
): Split | null {
  const total = rows.length
  const parent = countsOf(data, rows)
  let best: Split | null = null
  for (const feature of features) {
    const column = data.columns[feature]
    if (!column) continue
    const sorted = rows.toSorted((a, b) => (column[a] ?? 0) - (column[b] ?? 0))
    const left: [number, number] = [0, 0]
    for (let i = 0; i < total - 1; i++) {
      const row = sorted[i] ?? 0
      left[data.y[row] === 1 ? 1 : 0] += 1
      const here = column[row] ?? 0
      const next = column[sorted[i + 1] ?? 0] ?? 0
      const leftSize = i + 1
      if (here === next || leftSize < minSamplesLeaf || total - leftSize < minSamplesLeaf) continue
      const right: [number, number] = [parent[0] - left[0], parent[1] - left[1]]
      const impurity = (leftSize * gini(left) + (total - leftSize) * gini(right)) / total
      if (!best || impurity < best.impurity - 1e-12) {
        best = { feature, threshold: (here + next) / 2, impurity }
      }
    }
  }
  return best && best.impurity < gini(parent) - 1e-12 ? best : null
}

/** Picks `count` distinct feature indices out of `total` (a partial Fisher–Yates shuffle). */
function sampleFeatures(total: number, count: number, rng: Rng): number[] {
  const features = Array.from({ length: total }, (_, i) => i)
  for (let i = 0; i < Math.min(count, total); i++) {
    const j = i + Math.floor(rng() * (total - i))
    ;[features[i], features[j]] = [features[j] ?? 0, features[i] ?? 0]
  }
  return features.slice(0, count).toSorted((a, b) => a - b)
}

/**
 * Grows a classification tree (CART with Gini impurity) on the given rows; rows may repeat, as
 * in a bootstrap sample. Classes are 0/1 in `data.y`.
 */
export function growTree(
  data: TabularData,
  options: TreeOptions,
  rows: readonly number[] = Array.from(data.y, (_, i) => i),
): TreeNode {
  const featureCount = data.columns.length
  const grow = (nodeRows: readonly number[], depth: number): TreeNode => {
    const counts = countsOf(data, nodeRows)
    const leaf: TreeLeaf = { kind: 'leaf', counts }
    if (depth >= options.maxDepth || counts[0] === 0 || counts[1] === 0) return leaf
    const features =
      options.featuresPerSplit !== undefined && options.rng
        ? sampleFeatures(featureCount, options.featuresPerSplit, options.rng)
        : Array.from({ length: featureCount }, (_, i) => i)
    const split = bestSplit(data, nodeRows, features, Math.max(1, options.minSamplesLeaf))
    if (!split) return leaf
    const column = data.columns[split.feature]
    const leftRows = nodeRows.filter((row) => (column?.[row] ?? 0) < split.threshold)
    const rightRows = nodeRows.filter((row) => (column?.[row] ?? 0) >= split.threshold)
    return {
      kind: 'split',
      feature: split.feature,
      threshold: split.threshold,
      counts,
      left: grow(leftRows, depth + 1),
      right: grow(rightRows, depth + 1),
    }
  }
  return grow(rows, 0)
}

/** The leaf a point lands in. */
export function leafFor(tree: TreeNode, features: readonly number[]): TreeLeaf {
  let node = tree
  while (node.kind === 'split') {
    node = (features[node.feature] ?? 0) < node.threshold ? node.left : node.right
  }
  return node
}

/** P(class 1): the share of class-1 training points in the point's leaf (0.5 for an empty leaf). */
export function treeProbability(tree: TreeNode, features: readonly number[]): number {
  const { counts } = leafFor(tree, features)
  const total = counts[0] + counts[1]
  return total === 0 ? 0.5 : counts[1] / total
}

export function leafCount(tree: TreeNode): number {
  return tree.kind === 'leaf' ? 1 : leafCount(tree.left) + leafCount(tree.right)
}

export function treeDepth(tree: TreeNode): number {
  return tree.kind === 'leaf' ? 0 : 1 + Math.max(treeDepth(tree.left), treeDepth(tree.right))
}

/** Weighted Gini impurity of the leaves: how mixed the tree's final groups still are. */
export function treeImpurity(tree: TreeNode): number {
  const leaves: TreeLeaf[] = []
  const collect = (node: TreeNode) => {
    if (node.kind === 'leaf') leaves.push(node)
    else {
      collect(node.left)
      collect(node.right)
    }
  }
  collect(tree)
  const total = leaves.reduce((sum, leaf) => sum + leaf.counts[0] + leaf.counts[1], 0)
  if (total === 0) return 0
  return (
    leaves.reduce((sum, leaf) => sum + (leaf.counts[0] + leaf.counts[1]) * gini(leaf.counts), 0) /
    total
  )
}
