import type { LevelOf } from '@/models'
import { assertNever } from '@/lib'
import type { EvaluationService } from '@/services/EvaluationService'
import type { LevelRunner } from './LevelRunner'
import { SplitRunner } from './SplitRunner'

/** Runners for the decision-tree levels (World 3). */
export function treeRunners(
  level: LevelOf<'decision-tree'>,
  evaluation: EvaluationService,
): () => LevelRunner {
  const { algorithm } = level
  const optimizer = algorithm.optimizer
  switch (optimizer.id) {
    case 'manual-splits': {
      const narrowed = { ...level, algorithm: { ...algorithm, optimizer } }
      return () => new SplitRunner(narrowed, evaluation)
    }
    default:
      return assertNever(optimizer.id)
  }
}
