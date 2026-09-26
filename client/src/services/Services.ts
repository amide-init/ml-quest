import type { LevelService } from './LevelService'
import type { SettingsService } from './SettingsService'

/** Everything the UI can use, built once by app/Container.ts and provided through React context. */
export interface Services {
  readonly settings: SettingsService
  readonly levels: LevelService
}
