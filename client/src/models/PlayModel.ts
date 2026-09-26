import type { LevelConfig } from './LevelModel'
import type { LandscapeMap } from './MapModel'
import type { SessionState } from './SessionModel'
import type { LandscapeSnapshot } from './SnapshotModel'

/** Everything a level screen renders, from one subscription. */
export interface PlayView {
  readonly level: LevelConfig
  readonly map: LandscapeMap
  readonly session: SessionState
  readonly snapshot: LandscapeSnapshot
}
