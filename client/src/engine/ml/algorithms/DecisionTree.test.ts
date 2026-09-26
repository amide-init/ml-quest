import { describe, expect, it } from 'vitest'
import type { TabularData } from '@/models'
import { createSeededRandom } from '@/engine/math'
import { gini, growTree, leafCount, treeDepth, treeImpurity, treeProbability } from './DecisionTree'
import { forestProbability, growForest } from './RandomForest'

const table = (x1: number[], x2: number[], y: number[]): TabularData => ({
  columns: [Float64Array.from(x1), Float64Array.from(x2)],
  y: Float64Array.from(y),
})

// Class 1 when x₁ ≥ 5, whatever x₂ is.
const stump = table([1, 2, 3, 4, 6, 7, 8, 9], [5, 1, 8, 3, 2, 9, 4, 6], [0, 0, 0, 0, 1, 1, 1, 1])
// XOR: class 1 in the top-left and bottom-right quadrants. No single split helps.
const xor = table([1, 2, 8, 9, 1, 2, 8, 9], [1, 2, 8, 9, 8, 9, 1, 2], [0, 0, 0, 0, 1, 1, 1, 1])

describe('gini', () => {
  it('is 0 when pure and 0.5 when evenly mixed', () => {
    expect(gini([4, 0])).toBe(0)
    expect(gini([3, 3])).toBe(0.5)
    expect(gini([1, 3])).toBeCloseTo(0.375, 12)
  })
})

describe('growTree', () => {
  it('finds the one split that separates the classes, halfway between neighbours', () => {
    const tree = growTree(stump, { maxDepth: 3, minSamplesLeaf: 1 })
    expect(tree).toMatchObject({ kind: 'split', feature: 0, threshold: 5 })
    expect(leafCount(tree)).toBe(2)
    expect(treeImpurity(tree)).toBe(0)
    expect(treeProbability(tree, [7, 0])).toBe(1)
    expect(treeProbability(tree, [2, 0])).toBe(0)
  })

  it('respects the depth limit (depth 0 predicts the majority)', () => {
    const root = growTree(stump, { maxDepth: 0, minSamplesLeaf: 1 })
    expect(root).toEqual({ kind: 'leaf', counts: [4, 4] })
    expect(treeDepth(growTree(xor, { maxDepth: 1, minSamplesLeaf: 1 }))).toBeLessThanOrEqual(1)
  })

  it('does not split when no split improves purity, and stops at the leaf-size limit', () => {
    // On XOR no single split lowers impurity, so a greedy tree stays a leaf.
    expect(growTree(xor, { maxDepth: 5, minSamplesLeaf: 1 }).kind).toBe('leaf')
    // Leaves must keep 5 points, so 8 points can't be split at all.
    expect(growTree(stump, { maxDepth: 5, minSamplesLeaf: 5 }).kind).toBe('leaf')
  })

  it('grows the same tree from the same data', () => {
    const a = growTree(stump, { maxDepth: 4, minSamplesLeaf: 1 })
    expect(growTree(stump, { maxDepth: 4, minSamplesLeaf: 1 })).toEqual(a)
  })
})

describe('growForest', () => {
  it('is reproducible with the same seed and averages its trees', () => {
    const options = { trees: 5, maxDepth: 3, minSamplesLeaf: 1 }
    const a = growForest(stump, options, createSeededRandom(9))
    const b = growForest(stump, options, createSeededRandom(9))
    expect(a).toEqual(b)
    expect(a).toHaveLength(5)
    expect(forestProbability(a, [9, 5])).toBeGreaterThan(0.5)
    expect(forestProbability(a, [1, 5])).toBeLessThan(0.5)
  })

  it('with one feature per split, trees look at different features', () => {
    const forest = growForest(
      stump,
      { trees: 12, maxDepth: 1, minSamplesLeaf: 1, featuresPerSplit: 1 },
      createSeededRandom(2),
    )
    const rootFeatures = new Set(forest.map((tree) => (tree.kind === 'split' ? tree.feature : -1)))
    expect(rootFeatures.size).toBeGreaterThan(1)
  })
})
