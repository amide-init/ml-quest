import type { LevelConfig } from './LevelModel'
import type { LandscapeMap } from './MapModel'
import type { ConceptId } from './ProgressModel'
import type { SessionState } from './SessionModel'
import type { LandscapeSnapshot } from './SnapshotModel'

/** Everything a level screen renders, from one subscription. */
export interface PlayView {
  readonly level: LevelConfig
  readonly map: LandscapeMap
  readonly session: SessionState
  readonly snapshot: LandscapeSnapshot
  /** Set when a pass was recorded: whether it beat the previous best, and any newly unlocked concept. */
  readonly reward: PlayReward | null
}

export interface PlayReward {
  readonly newBest: boolean
  readonly unlockedConcept: ConceptId | null
}
