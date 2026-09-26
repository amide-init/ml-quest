/**
 * The pass-bot (ARCHITECTURE §10): replays every scripted run in content/levels/<world>/<id>.solution.json
 * through the real services and checks the outcome. Guarantees every level is winnable, and that
 * anti-solutions (the "obvious wrong moves") do NOT pass.
 */
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { BundledLevelRepository } from '@/repositories/bundled/BundledLevelRepository'
import { InMemoryProgressRepository } from '@/repositories/in-memory/InMemoryProgressRepository'
import { EvaluationService, LevelService, ProgressService, TrainingService } from '@/services'
import type { Command } from '@/models'

const solutionFileSchema = z.object({
  level: z.string(),
  runs: z
    .array(
      z.object({
        name: z.string(),
        expect: z.object({
          passed: z.boolean(),
          stars: z.number().int().min(0).max(3).optional(),
          status: z.enum(['ok', 'diverged']).optional(),
        }),
        commands: z.array(
          z.custom<Command>(
            (value) => typeof value === 'object' && value !== null && 'type' in value,
          ),
        ),
      }),
    )
    .min(1),
})

const SOLUTION_FILES = import.meta.glob('/content/levels/*/*.solution.json', {
  eager: true,
  import: 'default',
})
const repository = new BundledLevelRepository()

function createLevelService() {
  let time = 0
  // Each call advances the fake clock by 1 s, so no run ever triggers idle hints by accident.
  return new LevelService(
    repository,
    new TrainingService(new EvaluationService()),
    new ProgressService(new InMemoryProgressRepository()),
    () => (time += 1000),
  )
}

describe('pass-bot', () => {
  it('every level has a solution file', () => {
    const solved = new Set(
      Object.values(SOLUTION_FILES).map((file) => solutionFileSchema.parse(file).level),
    )
    const unsolved = repository
      .list()
      .map((level) => level.id)
      .filter((id) => !solved.has(id))
    expect(unsolved).toEqual([])
  })

  for (const [file, json] of Object.entries(SOLUTION_FILES)) {
    const solution = solutionFileSchema.parse(json)

    describe(solution.level, () => {
      it('has at least one run that passes', () => {
        expect(solution.runs.some((run) => run.expect.passed)).toBe(true)
      })

      it.each(solution.runs.map((run) => [run.name, run] as const))('%s', (_name, run) => {
        const session = createLevelService().startSession(solution.level)
        expect(session, `level ${solution.level} from ${file} not found`).not.toBeNull()
        session?.start()
        for (const command of run.commands) {
          session?.dispatch(command)
        }
        const view = session?.getView()
        expect(view?.session.phase).toBe(run.expect.passed ? 'passed' : 'failed')
        if (run.expect.stars !== undefined) {
          expect(view?.session.lastResult?.stars).toBe(run.expect.stars)
        }
        if (run.expect.status !== undefined) {
          const snapshot = view?.snapshot
          expect(snapshot?.kind === 'landscape' ? snapshot.status : 'n/a').toBe(run.expect.status)
        }
      })
    })
  }
})
