/**
 * Business logic and use cases (XxxService.ts). Plain TS classes with constructor-injected deps.
 * May import: repository interfaces, engine, models, lib, config, platform. Never React.
 * See ARCHITECTURE.md §4.
 */
export { EvaluationService } from './EvaluationService'
export { ExportService } from './ExportService'
export { LevelService } from './LevelService'
export type { UnlockPolicy } from './LevelService'
export { PlaySession } from './PlaySession'
export type { OnPassed } from './PlaySession'
export { ProgressService } from './ProgressService'
export type { RecordOutcome } from './ProgressService'
export { SettingsService } from './SettingsService'
export type { Services } from './Services'
export { TrainingService } from './TrainingService'
export type { LevelRunner } from './training/LevelRunner'
