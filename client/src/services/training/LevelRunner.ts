import type { Command, EvalResult, LevelScene, LevelSnapshot, SessionState } from '@/models'

/**
 * Runs one attempt of one level (ARCHITECTURE §6.1). Each algorithm family has its own runner;
 * PlaySession only talks to this interface.
 */
export interface LevelRunner {
  /** Static drawing data (contours, visible points). Never contains hidden test data. */
  readonly scene: LevelScene
  readonly snapshot: LevelSnapshot
  /** Apply a command and return the new snapshot. Previous snapshots are never mutated. */
  apply(command: Command): LevelSnapshot
  /**
   * Decide whether this command ends the attempt. Returns the evaluator's result when it does
   * (the ball reached the valley, the player pressed Check, a budget ran out), otherwise null.
   */
  judge(command: Command, session: SessionState): EvalResult | null
}
