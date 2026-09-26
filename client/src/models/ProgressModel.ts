import { z } from 'zod'
import { levelIdSchema } from './LevelModel'

export const conceptIdSchema = z.string().regex(/^[a-z0-9-]+$/, 'Concept ids are kebab-case')
export type ConceptId = z.infer<typeof conceptIdSchema>

export const levelProgressSchema = z.object({
  /** Best result ever. Only ever goes up (PRD: retries are free). */
  bestStars: z.number().int().min(1).max(3),
})
export type LevelProgress = z.infer<typeof levelProgressSchema>

/**
 * The player's saved progress (ARCHITECTURE §8.1). Unlocks are derived from this, never stored,
 * so adding levels in a later release can't leave a save in an impossible state.
 */
export const progressSchema = z.object({
  /** Only levels that were passed at least once appear here. */
  levels: z.record(levelIdSchema, levelProgressSchema),
  /** Concept cards unlocked in the ML Codex, in unlock order. */
  concepts: z.array(conceptIdSchema),
})
export type Progress = z.infer<typeof progressSchema>

export const DEFAULT_PROGRESS: Progress = { levels: {}, concepts: [] }
