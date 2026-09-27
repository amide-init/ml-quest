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
export type { Algorithm, Confusion, Rng, StepResult, StepStatus, Vector } from './EngineModel'
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
  LogisticLevelWith,
  TreeLevelWith,
  OptimizerId,
  RegressionLevelWith,
} from './LevelModel'
export type {
  BoundaryScene,
  CheckedPoint,
  CleaningScene,
  ComplexityScene,
  ContourLine,
  FeatureRange,
  FeatureScene,
  LabelledPoint,
  LandscapeMap,
  LevelScene,
  RegressionScene,
  ScalingScene,
  SplitScene,
  SigmoidScene,
  TrainingScene,
} from './MapModel'
export type { PlayReward, PlayView } from './PlayModel'
export type {
  BoundarySnapshot,
  CleaningSnapshot,
  ComplexitySnapshot,
  DecisionRegions,
  FeatureSnapshot,
  LandscapeSnapshot,
  LevelSnapshot,
  LossRun,
  PlayerSplit,
  ScalingSnapshot,
  SigmoidSnapshot,
  SplitLeaf,
  SplitSnapshot,
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
export type {
  ConceptId,
  LevelProgress,
  Progress,
  ProgressCodeProblem,
  ProgressCodeRead,
  ProgressSummary,
} from './ProgressModel'
export {
  linearMultiSpecSchema,
  linearNoisySpecSchema,
  polynomialFeatureSchema,
  gridRegionsSpecSchema,
  ringsSpecSchema,
  twoBlobsSpecSchema,
} from './DatasetModel'
export type {
  ClassificationData,
  DatasetSplit,
  LinearMultiSpec,
  LinearNoisySpec,
  PolynomialFeature,
  RegressionData,
  GridRegionsSpec,
  RingsSpec,
  TabularData,
  TwoBlobsSpec,
} from './DatasetModel'
export type { LevelState, LevelStatus, LevelSummary, WorldProgress } from './LevelStatusModel'
export type { TreeLeaf, TreeNode, TreeSplit } from './TreeModel'
