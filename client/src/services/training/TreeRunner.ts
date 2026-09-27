import type {
  CheckedPoint,
  ClassificationData,
  Command,
  DatasetSplit,
  EvalResult,
  LeafRegion,
  SessionState,
  TabularData,
  TreeLevelWith,
  TreeNode,
  TreeScene,
  TreeSnapshot,
} from '@/models'
import {
  createSeededRandom,
  generateClassification,
  growTree,
  hashSeed,
  leafCount,
  treeDepth,
  treeImpurity,
  treeProbability,
} from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const slider = (control: { min: number; max: number; step: number }) => ({
  min: control.min,
  max: control.max,
  step: control.step,
})

const tabular = ({ x1, x2, label }: ClassificationData): TabularData => ({
  columns: [x1, x2],
  y: Float64Array.from(label),
})

/** The tree's boxes over the map: each leaf's region, shaded by the class it predicts. */
function leafRegions(tree: TreeNode, bounds: LeafRegion['bounds']): LeafRegion[] {
  if (tree.kind === 'leaf') {
    return [{ bounds, prediction: tree.counts[1] > tree.counts[0] ? 1 : 0 }]
  }
  const { feature, threshold } = tree
  const left = feature === 0 ? { ...bounds, xMax: threshold } : { ...bounds, yMax: threshold }
  const right = feature === 0 ? { ...bounds, xMin: threshold } : { ...bounds, yMin: threshold }
  return [...leafRegions(tree.left, left), ...leafRegions(tree.right, right)]
}

/**
 * World 3 from level 4: the machine grows the tree (CART with Gini impurity) and the player sets
 * its limits: how deep it may grow (W3-L4 Overgrown) and how few mushrooms a leaf may hold (W3-L5
 * Pruning Shears). Train shows the tree and its training score; Check judges on hidden mushrooms.
 */
export class TreeRunner implements LevelRunner {
  readonly scene: TreeScene
  readonly #level: TreeLevelWith<'grown'>
  readonly #evaluation: EvaluationService
  readonly #data: DatasetSplit<ClassificationData>
  #tree: TreeNode | null = null
  #snapshot: TreeSnapshot

  constructor(level: TreeLevelWith<'grown'>, evaluation: EvaluationService) {
    this.#level = level
    this.#evaluation = evaluation
    this.#data = generateClassification(level.algorithm.dataset, {
      train: createSeededRandom(hashSeed(level.id, level.seed, 'train')),
      test: createSeededRandom(hashSeed(level.id, level.seed, 'test')),
    })
    const { x1, x2, label } = this.#data.train
    const { maxDepth, minLeaf } = level.algorithm.optimizer
    this.scene = {
      kind: 'tree',
      points: Array.from(x1, (x, i) => ({ x, y: x2[i] ?? 0, label: label[i] ?? 0 })),
      view: level.algorithm.view,
      maxDepth: typeof maxDepth === 'number' ? null : slider(maxDepth),
      minLeaf: minLeaf ? slider(minLeaf) : null,
    }
    this.#snapshot = {
      kind: 'tree',
      maxDepth: typeof maxDepth === 'number' ? maxDepth : maxDepth.initial,
      minLeaf: minLeaf?.initial ?? 1,
      trained: null,
      checked: null,
    }
  }

  get snapshot(): TreeSnapshot {
    return this.#snapshot
  }

  apply(command: Command): TreeSnapshot {
    const current = this.#snapshot
    switch (command.type) {
      case 'set-hyperparameter': {
        const control =
          command.name === 'maxDepth'
            ? this.scene.maxDepth
            : command.name === 'minLeaf'
              ? this.scene.minLeaf
              : null
        if (control && (command.name === 'maxDepth' || command.name === 'minLeaf')) {
          const value = Math.round(clamp(command.value, control.min, control.max))
          this.#snapshot = { ...current, [command.name]: value, checked: null }
        }
        break
      }
      case 'train':
        this.#snapshot = { ...current, trained: this.#grow(current), checked: null }
        break
      case 'check': {
        // Checking untrained (or changed) limits grows that tree first: Check judges what you set.
        const stale =
          !current.trained ||
          current.trained.maxDepth !== current.maxDepth ||
          current.trained.minLeaf !== current.minLeaf
        const trained = stale ? this.#grow(current) : current.trained
        this.#snapshot = { ...current, trained, checked: this.#checkedPoints() }
        break
      }
      default:
        break
    }
    return this.#snapshot
  }

  /** Only Check is judged; Train is free exploration on the training data. */
  judge(command: Command, session: SessionState): EvalResult | null {
    const trained = this.#snapshot.trained
    if (command.type !== 'check' || !trained || !this.#tree) {
      return null
    }
    const test = this.#data.test
    const testCorrect = this.#checkedPoints().filter((point) => point.correct).length
    return this.#evaluation.evaluate(this.#level, {
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      attempt: session.attempt,
      trainAccuracy: trained.correct / trained.total,
      testAccuracy: testCorrect / test.label.length,
      leafCount: trained.leafCount,
      impurity: treeImpurity(this.#tree),
    })
  }

  #predict(x: number, y: number): 0 | 1 {
    return this.#tree && treeProbability(this.#tree, [x, y]) > 0.5 ? 1 : 0
  }

  #checkedPoints(): CheckedPoint[] {
    const { x1, x2, label } = this.#data.test
    return Array.from(x1, (x, i) => {
      const y = x2[i] ?? 0
      const actual = label[i] ?? 0
      return { x, y, label: actual, correct: this.#predict(x, y) === actual }
    })
  }

  #grow({ maxDepth, minLeaf }: { maxDepth: number; minLeaf: number }): TreeSnapshot['trained'] {
    const tree = growTree(tabular(this.#data.train), { maxDepth, minSamplesLeaf: minLeaf })
    this.#tree = tree
    const { x1, x2, label } = this.#data.train
    let correct = 0
    label.forEach((actual, i) => {
      if (this.#predict(x1[i] ?? 0, x2[i] ?? 0) === actual) correct++
    })
    return {
      maxDepth,
      minLeaf,
      tree,
      leaves: leafRegions(tree, this.#level.algorithm.view),
      leafCount: leafCount(tree),
      depth: treeDepth(tree),
      correct,
      total: label.length,
    }
  }
}
