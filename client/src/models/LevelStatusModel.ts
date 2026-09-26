/** A level as the map lists it. */
export interface LevelSummary {
  readonly id: string
  readonly world: number
  readonly level: number
  /** Locale key of the title. */
  readonly title: string
}

/** Where a level stands for the player (PRD F1): locked, open to play, or passed. */
export type LevelState = 'locked' | 'open' | 'completed'

export interface LevelStatus {
  readonly state: LevelState
  /** For a locked level: the level to pass first. Null otherwise. */
  readonly requires: LevelSummary | null
  /**
   * For a locked level: where the player can actually continue, the first open level on the
   * path (it may be well before `requires`, which can be locked too). Null otherwise.
   */
  readonly playNext: LevelSummary | null
}

/** One world's standing on the map: how far the player is, and whether it's done. */
export interface WorldProgress {
  readonly world: number
  readonly levels: number
  readonly passed: number
  readonly stars: number
  /** 3 per level. */
  readonly maxStars: number
  /** Every level passed. */
  readonly complete: boolean
  /** Where the player is: the first world that isn't complete (the last one if all are). */
  readonly current: boolean
}
