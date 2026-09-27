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
  forestProbability,
  generateClassification,
  growForest,
  growTree,
  hashSeed,
  leafCount,
  treeDepth,
  treeImpurity,
  treeProbability,
} from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'
import { borderOf, sampleRegions } from './Regions'

type Trained = NonNullable<TreeSnapshot['trained']>
type Limits = { readonly maxDepth: number; readonly minLeaf: number; readonly trees: number }

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

const sameLimits = (a: Limits, b: Limits) =>
  a.maxDepth === b.maxDepth && a.minLeaf === b.minLeaf && a.trees === b.trees

/** Grid over the map on which retrained trees are compared (the disagreement readout). */
const AGREEMENT_GRID = { cols: 40, rows: 32 }

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
 * its limits: depth (W3-L4), minimum leaf size (W3-L5), and for forests how many trees vote
 * (W3-L7, the boss). With `resamples` (W3-L6) it also regrows the tree on resampled data and
 * shows how much those trees disagree. Train shows the model and its training score; Check
 * judges on hidden mushrooms and reveals them (D6).
 */
export class TreeRunner implements LevelRunner {
  readonly scene: TreeScene
  readonly #level: TreeLevelWith<'grown'>
  readonly #evaluation: EvaluationService
  readonly #data: DatasetSplit<ClassificationData>
  /** The trained model's P(safe) at a point. */
  #probability: ((x: number, y: number) => number) | null = null
  #snapshot: TreeSnapshot

  constructor(level: TreeLevelWith<'grown'>, evaluation: EvaluationService) {
    this.#level = level
    this.#evaluation = evaluation
    this.#data = generateClassification(level.algorithm.dataset, {
      train: createSeededRandom(hashSeed(level.id, level.seed, 'train')),
      test: createSeededRandom(hashSeed(level.id, level.seed, 'test')),
    })
    const { x1, x2, label } = this.#data.train
    const { maxDepth, minLeaf, trees, resamples } = level.algorithm.optimizer
    this.scene = {
      kind: 'tree',
      points: Array.from(x1, (x, i) => ({ x, y: x2[i] ?? 0, label: label[i] ?? 0 })),
      view: level.algorithm.view,
      maxDepth: typeof maxDepth === 'number' ? null : slider(maxDepth),
      minLeaf: minLeaf ? slider(minLeaf) : null,
      trees: trees ? slider(trees) : null,
      resamples: resamples ?? null,
    }
    this.#snapshot = {
      kind: 'tree',
      maxDepth: typeof maxDepth === 'number' ? maxDepth : maxDepth.initial,
      minLeaf: minLeaf?.initial ?? 1,
      trees: trees?.initial ?? 1,
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
        const { name } = command
        if (name !== 'maxDepth' && name !== 'minLeaf' && name !== 'trees') break
        const control = this.scene[name]
        if (control) {
          const value = Math.round(clamp(command.value, control.min, control.max))
          this.#snapshot = { ...current, [name]: value, checked: null }
        }
        break
      }
      case 'train':
        this.#snapshot = { ...current, trained: this.#grow(current), checked: null }
        break
      case 'check': {
        // Checking untrained (or changed) limits grows that model first: Check judges what you set.
        const trained =
          current.trained && sameLimits(current.trained, current)
            ? current.trained
            : this.#grow(current)
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
    if (command.type !== 'check' || !trained) {
      return null
    }
    const checked = this.#snapshot.checked ?? this.#checkedPoints()
    return this.#evaluation.evaluate(this.#level, {
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      attempt: session.attempt,
      trainAccuracy: trained.correct / trained.total,
      testAccuracy: checked.filter((point) => point.correct).length / checked.length,
      leafCount: trained.leafCount,
      impurity: treeImpurity(trained.tree),
      ...(trained.disagreement === null ? {} : { instability: trained.disagreement }),
    })
  }

  #predict(x: number, y: number): 0 | 1 {
    return this.#probability && this.#probability(x, y) > 0.5 ? 1 : 0
  }

  #checkedPoints(): CheckedPoint[] {
    const { x1, x2, label } = this.#data.test
    return Array.from(x1, (x, i) => {
      const y = x2[i] ?? 0
      const actual = label[i] ?? 0
      return { x, y, label: actual, correct: this.#predict(x, y) === actual }
    })
  }

  #grow(limits: Limits): Trained {
    const { maxDepth, minLeaf, trees } = limits
    const table = tabular(this.#data.train)
    const { id, seed, algorithm } = this.#level
    const view = algorithm.view
    const options = { maxDepth, minSamplesLeaf: minLeaf }
    const forest = this.scene.trees
      ? growForest(table, { ...options, trees }, createSeededRandom(hashSeed(id, seed, 'forest')))
      : null
    const tree = forest?.[0] ?? growTree(table, options)
    this.#probability = forest
      ? (x, y) => forestProbability(forest, [x, y])
      : (x, y) => treeProbability(tree, [x, y])
    const score = (x: number, y: number) => (this.#probability?.(x, y) ?? 0.5) - 0.5

    // Variance made visible: the same limits, regrown on resampled data.
    const resampled = this.scene.resamples
      ? growForest(
          table,
          { ...options, trees: this.scene.resamples },
          createSeededRandom(hashSeed(id, seed, 'resamples')),
        )
      : []
    const ghosts = resampled.map((other) =>
      borderOf(view, (x, y) => treeProbability(other, [x, y]) - 0.5),
    )

    const { x1, x2, label } = this.#data.train
    let correct = 0
    label.forEach((actual, i) => {
      if (this.#predict(x1[i] ?? 0, x2[i] ?? 0) === actual) correct++
    })
    return {
      maxDepth,
      minLeaf,
      trees,
      tree,
      leaves: forest ? [] : leafRegions(tree, view),
      regions: forest ? sampleRegions(view, score) : null,
      boundary: forest ? borderOf(view, score) : [],
      ghosts,
      disagreement: resampled.length > 0 ? this.#disagreement(resampled) : null,
      leafCount: leafCount(tree),
      depth: treeDepth(tree),
      correct,
      total: label.length,
    }
  }

  /** Average share of the retrained trees that disagree with their majority, over the map. */
  #disagreement(trees: readonly TreeNode[]): number {
    const { xMin, xMax, yMin, yMax } = this.#level.algorithm.view
    const { cols, rows } = AGREEMENT_GRID
    let total = 0
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = xMin + ((col + 0.5) / cols) * (xMax - xMin)
        const y = yMin + ((row + 0.5) / rows) * (yMax - yMin)
        const safe = trees.filter((tree) => treeProbability(tree, [x, y]) > 0.5).length
        total += Math.min(safe, trees.length - safe) / trees.length
      }
    }
    return total / (cols * rows)
  }
}
