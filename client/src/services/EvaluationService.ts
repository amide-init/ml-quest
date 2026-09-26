import type { EvalResult, LevelConfig } from '@/models'
import { computeMetrics, evaluate, type MetricInput } from '@/engine'

/** Wraps the engine's evaluator: the only place a pass/fail or star count is produced (ARCHITECTURE §5.4). */
export class EvaluationService {
  evaluate<TData>(level: LevelConfig, input: MetricInput<TData>): EvalResult {
    return evaluate(level.stars, computeMetrics(input))
  }
}
