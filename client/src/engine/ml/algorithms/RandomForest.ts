import type { Rng, TabularData, TreeNode } from '@/models'
import { growTree, treeProbability, type TreeOptions } from './DecisionTree'

export interface ForestOptions extends Omit<TreeOptions, 'rng'> {
  readonly trees: number
}

/**
 * Bagging / random forest: each tree grows on a bootstrap sample (n rows drawn with replacement),
 * and, with `featuresPerSplit`, looks at a random subset of features at every split.
 */
export function growForest(data: TabularData, options: ForestOptions, rng: Rng): TreeNode[] {
  const n = data.y.length
  return Array.from({ length: options.trees }, () => {
    const rows = Array.from({ length: n }, () => Math.floor(rng() * n))
    return growTree(data, { ...options, rng }, rows)
  })
}

/** The forest's P(class 1): the average of its trees' probabilities. */
export function forestProbability(
  forest: readonly TreeNode[],
  features: readonly number[],
): number {
  if (forest.length === 0) return 0.5
  return forest.reduce((sum, tree) => sum + treeProbability(tree, features), 0) / forest.length
}
