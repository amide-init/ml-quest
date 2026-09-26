import type { LevelConfig } from './LevelModel'
import type { LevelScene } from './MapModel'
import type { ConceptId } from './ProgressModel'
import type { SessionState } from './SessionModel'
import type { LevelSnapshot } from './SnapshotModel'

/** Everything a level screen renders, from one subscription. scene.kind and snapshot.kind always match. */
export interface PlayView {
  readonly level: LevelConfig
  readonly scene: LevelScene
  readonly session: SessionState
  readonly snapshot: LevelSnapshot
  /** Set when a pass was recorded: whether it beat the previous best, and any newly unlocked concept. */
  readonly reward: PlayReward | null
}

export interface PlayReward {
  readonly newBest: boolean
  readonly unlockedConcept: ConceptId | null
}
