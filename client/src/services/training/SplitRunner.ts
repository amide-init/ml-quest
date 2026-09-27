import type {
  CheckedPoint,
  ClassificationData,
  Command,
  DatasetSplit,
  EvalResult,
  PlayerSplit,
  SessionState,
  SplitLeaf,
  SplitScene,
  SplitSnapshot,
  TreeLevelWith,
  TreeNode,
} from '@/models'
import {
  createSeededRandom,
  generateClassification,
  gini,
  hashSeed,
  leafCount,
  treeImpurity,
} from '@/engine'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'

type Bounds = SplitLeaf['bounds']

/** A split may not sit closer than this share of its region to an edge (no empty slivers). */
const EDGE = 0.02

const clampInto = (value: number, min: number, max: number) => {
  const margin = (max - min) * EDGE
  return Math.min(Math.max(value, min + margin), max - margin)
}

interface Built {
  readonly tree: TreeNode
  readonly leaves: SplitLeaf[]
  /** The player's splits, thresholds clamped into their regions. */
  readonly splits: PlayerSplit[]
}

/**
 * World 3, levels 1–3: the player builds a decision tree by hand. Each question splits one region
 * along cap width (x₁) or stem height (x₂); every final region predicts its majority. Check judges
 * the tree on hidden mushrooms and reveals them (D6).
 */
export class SplitRunner implements LevelRunner {
  readonly scene: SplitScene
  readonly #level: TreeLevelWith<'manual-splits'>
  readonly #evaluation: EvaluationService
  readonly #data: DatasetSplit<ClassificationData>
  #snapshot: SplitSnapshot

  constructor(level: TreeLevelWith<'manual-splits'>, evaluation: EvaluationService) {
    this.#level = level
    this.#evaluation = evaluation
    this.#data = generateClassification(level.algorithm.dataset, {
      train: createSeededRandom(hashSeed(level.id, level.seed, 'train')),
      test: createSeededRandom(hashSeed(level.id, level.seed, 'test')),
    })
    const { x1, x2, label } = this.#data.train
    const { maxSplits, showImpurity } = level.algorithm.optimizer
    this.scene = {
      kind: 'splits',
      points: Array.from(x1, (x, i) => ({ x, y: x2[i] ?? 0, label: label[i] ?? 0 })),
      view: level.algorithm.view,
      maxSplits,
      showImpurity,
    }
    this.#snapshot = this.#describe([], null)
  }

  get snapshot(): SplitSnapshot {
    return this.#snapshot
  }

  apply(command: Command): SplitSnapshot {
    const { splits } = this.#snapshot
    switch (command.type) {
      case 'add-split': {
        const isLeaf = this.#snapshot.leaves.some((leaf) => leaf.path === command.leaf)
        if (isLeaf && splits.length < this.scene.maxSplits) {
          const split = { path: command.leaf, axis: command.axis, threshold: command.threshold }
          this.#snapshot = this.#describe([...splits, split], null)
        }
        break
      }
      case 'move-split':
        if (splits.some((split) => split.path === command.node)) {
          const moved = splits.map((split) =>
            split.path === command.node ? { ...split, threshold: command.threshold } : split,
          )
          this.#snapshot = this.#describe(moved, null)
        }
        break
      case 'remove-split': {
        // Removing a question also removes every question asked below it.
        const kept = splits.filter(
          (split) =>
            split.path !== command.node &&
            !split.path.startsWith(command.node + 'L') &&
            !split.path.startsWith(command.node + 'R'),
        )
        this.#snapshot = this.#describe(kept, null)
        break
      }
      case 'check':
        this.#snapshot = { ...this.#snapshot, checked: this.#checkedPoints() }
        break
      default:
        break
    }
    return this.#snapshot
  }

  /** Only Check is judged, on the hidden mushrooms. */
  judge(command: Command, session: SessionState): EvalResult | null {
    if (command.type !== 'check') {
      return null
    }
    const { tree, correct, total, impurity } = this.#snapshot
    const test = this.#data.test
    let testCorrect = 0
    test.label.forEach((label, i) => {
      if (this.#predict(test.x1[i] ?? 0, test.x2[i] ?? 0) === label) testCorrect++
    })
    return this.#evaluation.evaluate(this.#level, {
      trace: session.trace,
      hintsRevealed: session.hintsRevealed,
      attempt: session.attempt,
      trainAccuracy: correct / total,
      testAccuracy: testCorrect / test.label.length,
      leafCount: leafCount(tree),
      impurity,
    })
  }

  #checkedPoints(): CheckedPoint[] {
    const { x1, x2, label } = this.#data.test
    return Array.from(x1, (x, i) => {
      const y = x2[i] ?? 0
      const actual = label[i] ?? 0
      return { x, y, label: actual, correct: this.#predict(x, y) === actual }
    })
  }

  /** The class of the region a point falls in. */
  #predict(x: number, y: number): 0 | 1 {
    const byPath = new Map(this.#snapshot.splits.map((split) => [split.path, split]))
    let path = ''
    for (let split = byPath.get(path); split; split = byPath.get(path)) {
      path += (split.axis === 0 ? x : y) < split.threshold ? 'L' : 'R'
    }
    return this.#snapshot.leaves.find((leaf) => leaf.path === path)?.prediction ?? 0
  }

  #describe(splits: readonly PlayerSplit[], checked: CheckedPoint[] | null): SplitSnapshot {
    const built = this.#build(splits)
    const { x1, x2, label } = this.#data.train
    const byPath = new Map(built.splits.map((split) => [split.path, split]))
    let correct = 0
    label.forEach((actual, i) => {
      let path = ''
      for (let split = byPath.get(path); split; split = byPath.get(path)) {
        path += (split.axis === 0 ? (x1[i] ?? 0) : (x2[i] ?? 0)) < split.threshold ? 'L' : 'R'
      }
      if (built.leaves.find((leaf) => leaf.path === path)?.prediction === actual) correct++
    })
    return {
      kind: 'splits',
      splits: built.splits,
      tree: built.tree,
      leaves: built.leaves,
      correct,
      total: label.length,
      impurity: treeImpurity(built.tree),
      checked,
    }
  }

  /** Grows the player's tree over the training points, region by region from the whole map. */
  #build(splits: readonly PlayerSplit[]): Built {
    const { x1, x2, label } = this.#data.train
    const byPath = new Map(splits.map((split) => [split.path, split]))
    const leaves: SplitLeaf[] = []
    const effective: PlayerSplit[] = []
    const countOf = (rows: readonly number[]): [number, number] => {
      const counts: [number, number] = [0, 0]
      for (const row of rows) counts[label[row] === 1 ? 1 : 0] += 1
      return counts
    }
    const grow = (path: string, bounds: Bounds, rows: number[], inherited: 0 | 1): TreeNode => {
      const counts = countOf(rows)
      const prediction: 0 | 1 = counts[1] > counts[0] ? 1 : counts[0] > counts[1] ? 0 : inherited
      const split = byPath.get(path)
      if (!split) {
        leaves.push({ path, bounds, counts, prediction, impurity: gini(counts) })
        return { kind: 'leaf', counts }
      }
      const [min, max] = split.axis === 0 ? [bounds.xMin, bounds.xMax] : [bounds.yMin, bounds.yMax]
      const threshold = clampInto(split.threshold, min, max)
      effective.push({ ...split, threshold })
      const value = (row: number) => (split.axis === 0 ? (x1[row] ?? 0) : (x2[row] ?? 0))
      const leftBounds =
        split.axis === 0 ? { ...bounds, xMax: threshold } : { ...bounds, yMax: threshold }
      const rightBounds =
        split.axis === 0 ? { ...bounds, xMin: threshold } : { ...bounds, yMin: threshold }
      return {
        kind: 'split',
        feature: split.axis,
        threshold,
        counts,
        left: grow(
          path + 'L',
          leftBounds,
          rows.filter((row) => value(row) < threshold),
          prediction,
        ),
        right: grow(
          path + 'R',
          rightBounds,
          rows.filter((row) => value(row) >= threshold),
          prediction,
        ),
      }
    }
    const rows = Array.from(label, (_, i) => i)
    const overall = countOf(rows)
    const tree = grow('', this.#level.algorithm.view, rows, overall[1] >= overall[0] ? 1 : 0)
    return { tree, leaves, splits: effective }
  }
}
