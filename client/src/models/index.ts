/**
 * Domain entities, types and Zod schemas (XxxModel.ts). Shared by every layer.
 * Note: ML models are "algorithms" and live in engine/ml/algorithms, not here.
 * See ARCHITECTURE.md §4.
 */
export {
  DEFAULT_SETTINGS,
  localeSchema,
  motionPreferenceSchema,
  settingsSchema,
  themePreferenceSchema,
} from './SettingsModel'
export type {
  Locale,
  MotionPreference,
  Settings,
  SettingsPatch,
  ThemePreference,
} from './SettingsModel'
export type { Algorithm, Rng, StepResult, StepStatus, Vector } from './EngineModel'
export { landscapeSpecSchema, pointSchema } from './LandscapeModel'
export type { LandscapeSpec, Point } from './LandscapeModel'
export type { Command, CommandType, HyperparameterName } from './CommandModel'
export {
  comparisonSchema,
  conditionSchema,
  metricIdSchema,
  starRulesSchema,
} from './ConditionModel'
export type { Comparison, Condition, LeafCondition, MetricId, StarRules } from './ConditionModel'
export type { ConditionFailure, EvalResult, Metrics, StarCount } from './EvalResultModel'
export type { SessionEvent, SessionPhase, SessionState, TracedCommand } from './SessionModel'
export { levelAlgorithmSchema, levelConfigSchema, levelIdSchema } from './LevelModel'
export type {
  AlgorithmId,
  LandscapeLevelWith,
  LandscapeOptimizerId,
  LevelAlgorithm,
  LevelConfig,
  LevelId,
  LevelOf,
  OptimizerId,
  RegressionLevelWith,
} from './LevelModel'
export type {
  ContourLine,
  LandscapeMap,
  LevelScene,
  RegressionScene,
  TrainingScene,
} from './MapModel'
export type { PlayReward, PlayView } from './PlayModel'
export type {
  LandscapeSnapshot,
  LevelSnapshot,
  RegressionSnapshot,
  TrainingRun,
  TrainingSnapshot,
} from './SnapshotModel'
export {
  conceptIdSchema,
  DEFAULT_PROGRESS,
  levelProgressSchema,
  progressSchema,
} from './ProgressModel'
export type { ConceptId, LevelProgress, Progress } from './ProgressModel'
export { linearNoisySpecSchema } from './DatasetModel'
export type { DatasetSplit, LinearNoisySpec, RegressionData } from './DatasetModel'
