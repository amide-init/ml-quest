import type { LevelConfig } from '@/models'
import { LandscapeRunner } from './training/LandscapeRunner'

/**
 * The app's only entry point for running an algorithm (ARCHITECTURE §6.1).
 * Every current level is a landscape level, cheap enough to run inline. When a second algorithm
 * arrives (linear regression, W1-L1), switch on level.algorithm.id here; training loops (W1-L4)
 * get a WorkerRunner.
 */
export class TrainingService {
  createRunner(level: LevelConfig): LandscapeRunner {
    return new LandscapeRunner(level)
  }
}
