import type { LandscapeMap, LevelConfig } from '@/models'
import { assertNever } from '@/lib'
import type { EvaluationService } from './EvaluationService'
import type { LevelRunner } from './training/LevelRunner'

/**
 * The app's only entry point for running an algorithm (ARCHITECTURE §6.1). Each model family's
 * runners and engine code load on demand as their own chunk, so the first page load carries no
 * training code and a new world adds none (ARCHITECTURE D5). Everything runs inline.
 */
export class TrainingService {
  readonly #evaluation: EvaluationService
  readonly #maps = new Map<string, LandscapeMap>()

  constructor(evaluation: EvaluationService) {
    this.#evaluation = evaluation
  }

  /** Loads the level's model family and returns a factory: one fresh runner per attempt. */
  async loadRunner(level: LevelConfig): Promise<() => LevelRunner> {
    const algorithm = level.algorithm
    switch (algorithm.id) {
      case 'landscape-2d': {
        const { landscapeRunners } = await import('./training/LandscapeFamily')
        return landscapeRunners({ ...level, algorithm }, this.#evaluation, this.#maps)
      }
      case 'linear-regression': {
        const { linearRegressionRunners } = await import('./training/RegressionFamily')
        return linearRegressionRunners({ ...level, algorithm }, this.#evaluation)
      }
      case 'multi-linear-regression': {
        const { multiLinearRegressionRunners } = await import('./training/RegressionFamily')
        return multiLinearRegressionRunners({ ...level, algorithm }, this.#evaluation)
      }
      case 'logistic-regression': {
        const { classificationRunners } = await import('./training/ClassificationFamily')
        return classificationRunners({ ...level, algorithm }, this.#evaluation)
      }
      case 'decision-tree': {
        const { treeRunners } = await import('./training/TreeFamily')
        return treeRunners({ ...level, algorithm }, this.#evaluation)
      }
      default:
        return assertNever(algorithm)
    }
  }
}
