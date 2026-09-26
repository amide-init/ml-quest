import { levelConfigSchema, type LevelConfig } from '@/models'
import type { LevelRepository } from '@/repositories/LevelRepository'

/**
 * Level JSON bundled with the app. Solutions (*.solution.json) are excluded here: they are for the
 * pass-bot only and must never ship (ARCHITECTURE §4 rule 5).
 * TODO(perf): switch to lazy per-world chunks (non-eager glob) once World 1 has more levels.
 */
const BUNDLED_LEVELS: Record<string, unknown> = import.meta.glob(
  ['/content/levels/*/*.json', '!/content/levels/*/*.solution.json'],
  { eager: true, import: 'default' },
)

export class BundledLevelRepository implements LevelRepository {
  readonly #levels = new Map<string, LevelConfig>()
  /** Files that failed validation, with the reason. A broken level is skipped, not fatal. */
  readonly invalid: readonly { readonly file: string; readonly error: string }[]

  constructor(sources: Record<string, unknown> = BUNDLED_LEVELS) {
    const invalid: { file: string; error: string }[] = []
    for (const [file, json] of Object.entries(sources)) {
      const parsed = levelConfigSchema.safeParse(json)
      if (parsed.success) {
        this.#levels.set(parsed.data.id, parsed.data)
      } else {
        invalid.push({ file, error: parsed.error.message })
        console.error(`Level ${file} is invalid and was skipped:`, parsed.error.message)
      }
    }
    this.invalid = invalid
  }

  get(id: string): LevelConfig | null {
    return this.#levels.get(id) ?? null
  }

  list(): readonly LevelConfig[] {
    return [...this.#levels.values()]
  }
}
