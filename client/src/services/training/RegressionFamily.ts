import type { LevelOf } from '@/models'
import { assertNever } from '@/lib'
import type { EvaluationService } from '@/services/EvaluationService'
import { CleaningRunner } from './CleaningRunner'
import { GradientDescentRunner } from './GradientDescentRunner'
import type { LevelRunner } from './LevelRunner'
import { RegressionRunner } from './RegressionRunner'
import { ScalingRunner } from './ScalingRunner'

/** Runners for line-fitting levels (World 1: drag, train, clean). */
export function linearRegressionRunners(
  level: LevelOf<'linear-regression'>,
  evaluation: EvaluationService,
): () => LevelRunner {
  const { algorithm } = level
  const optimizer = algorithm.optimizer
  switch (optimizer.id) {
    case 'manual': {
      const narrowed = { ...level, algorithm: { ...algorithm, optimizer } }
      return () => new RegressionRunner(narrowed, evaluation)
    }
    case 'gradient-descent': {
      const narrowed = { ...level, algorithm: { ...algorithm, optimizer } }
      return () => new GradientDescentRunner(narrowed, evaluation)
    }
    case 'least-squares': {
      const narrowed = { ...level, algorithm: { ...algorithm, optimizer } }
      return () => new CleaningRunner(narrowed, evaluation)
    }
    default:
      return assertNever(optimizer)
  }
}

/** Runner for the two-feature scaling level (W1-L7). */
export function multiLinearRegressionRunners(
  level: LevelOf<'multi-linear-regression'>,
  evaluation: EvaluationService,
): () => LevelRunner {
  return () => new ScalingRunner(level, evaluation)
}
