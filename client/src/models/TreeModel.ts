/** A decision tree over numeric features (World 3). Plain data, so snapshots can carry it. */
export type TreeNode = TreeLeaf | TreeSplit

export interface TreeLeaf {
  readonly kind: 'leaf'
  /** Training points of class 0 and class 1 that end here. */
  readonly counts: readonly [number, number]
}

export interface TreeSplit {
  readonly kind: 'split'
  /** Feature index (0 = x₁, 1 = x₂). Points with value < threshold go left. */
  readonly feature: number
  readonly threshold: number
  readonly counts: readonly [number, number]
  readonly left: TreeNode
  readonly right: TreeNode
}
