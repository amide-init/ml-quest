import type { LevelOf } from '@/models'
import { assertNever } from '@/lib'
import type { EvaluationService } from '@/services/EvaluationService'
import { BoundaryRunner } from './BoundaryRunner'
import { ComplexityRunner } from './ComplexityRunner'
import { FeatureRunner } from './FeatureRunner'
import type { LevelRunner } from './LevelRunner'
import { SigmoidRunner } from './SigmoidRunner'

/** Runners for the classification levels (World 2). */
export function classificationRunners(
  level: LevelOf<'logistic-regression'>,
  evaluation: EvaluationService,
): () => LevelRunner {
  const { algorithm } = level
  const optimizer = algorithm.optimizer
  switch (optimizer.id) {
    case 'manual-boundary': {
      const narrowed = { ...level, algorithm: { ...algorithm, optimizer } }
      return () => new BoundaryRunner(narrowed, evaluation)
    }
    case 'manual-sigmoid': {
      const narrowed = { ...level, algorithm: { ...algorithm, optimizer } }
      return () => new SigmoidRunner(narrowed, evaluation)
    }
    case 'feature-builder': {
      const narrowed = { ...level, algorithm: { ...algorithm, optimizer } }
      return () => new FeatureRunner(narrowed, evaluation)
    }
    case 'complexity': {
      const narrowed = { ...level, algorithm: { ...algorithm, optimizer } }
      return () => new ComplexityRunner(narrowed, evaluation)
    }
    default:
      return assertNever(optimizer)
  }
}
