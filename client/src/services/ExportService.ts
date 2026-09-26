import { crc32, deflateRaw, fromBase64Url, inflateRaw, toBase64Url } from '@/lib'
import {
  progressSchema,
  type Progress,
  type ProgressCodeRead,
  type ProgressSummary,
} from '@/models'
import type { ProgressService } from './ProgressService'

/** Code format version (the "MLQ1-" prefix) and the progress schema version it carries. */
const PREFIX = 'MLQ1'
const PROGRESS_VERSION = 1
const DEFLATED = 1
const PLAIN = 0

export const summarize = (progress: Progress): ProgressSummary => ({
  stars: Object.values(progress.levels).reduce((sum, level) => sum + level.bestStars, 0),
  levels: Object.keys(progress.levels).length,
  concepts: progress.concepts.length,
})

/**
 * Progress export/import codes (PRD F8, ARCHITECTURE §8.2), so a player can move devices:
 * `MLQ1-<base64url(flag + deflate(JSON {v, data}))>-<crc32 of the body>`. The flag byte marks
 * plain JSON on the rare browser without CompressionStream. Reading checks the prefix, the
 * checksum (copy-paste truncation), then decodes and validates with the progress schema.
 */
export class ExportService {
  readonly #progress: ProgressService

  constructor(progress: ProgressService) {
    this.#progress = progress
  }

  async createCode(): Promise<string> {
    const json = JSON.stringify({ v: PROGRESS_VERSION, data: this.#progress.getProgress() })
    const bytes = new TextEncoder().encode(json)
    const deflated = await deflateRaw(bytes)
    const body = toBase64Url(
      deflated ? Uint8Array.of(DEFLATED, ...deflated) : Uint8Array.of(PLAIN, ...bytes),
    )
    return `${PREFIX}-${body}-${crc32(body)}`
  }

  async readCode(code: string): Promise<ProgressCodeRead> {
    // Chat apps and emails wrap long strings: ignore any whitespace the paste picked up.
    const compact = code.replace(/\s+/g, '')
    const match = /^MLQ(\d+)-([A-Za-z0-9_-]+)-([0-9a-f]{8})$/i.exec(compact)
    if (!match) {
      // Starts like a code but the end is gone: a cut-off paste, not a foreign string.
      return { ok: false, problem: /^MLQ\d+-/i.test(compact) ? 'checksum' : 'format' }
    }
    const [, version = '', body = '', checksum = ''] = match
    if (Number(version) > 1) return { ok: false, problem: 'newer' }
    if (Number(version) !== 1) return { ok: false, problem: 'format' }
    if (crc32(body) !== checksum.toLowerCase()) return { ok: false, problem: 'checksum' }

    let envelope: unknown
    try {
      const bytes = fromBase64Url(body)
      const payload =
        bytes[0] === DEFLATED ? await inflateRaw(bytes.subarray(1)) : bytes.subarray(1)
      if (!payload || (bytes[0] !== DEFLATED && bytes[0] !== PLAIN)) {
        return { ok: false, problem: 'unreadable' }
      }
      envelope = JSON.parse(new TextDecoder().decode(payload))
    } catch {
      return { ok: false, problem: 'unreadable' }
    }
    const payloadVersion = (envelope as { v?: unknown } | null)?.v
    if (typeof payloadVersion === 'number' && payloadVersion > PROGRESS_VERSION) {
      return { ok: false, problem: 'newer' }
    }
    // Same validation as loading a save (RULES: Zod at every boundary). Migrations for older
    // progress versions will run here once a v2 exists.
    const parsed = progressSchema.safeParse((envelope as { data?: unknown } | null)?.data)
    if (payloadVersion !== PROGRESS_VERSION || !parsed.success) {
      return { ok: false, problem: 'unreadable' }
    }
    return {
      ok: true,
      progress: parsed.data,
      incoming: summarize(parsed.data),
      current: summarize(this.#progress.getProgress()),
    }
  }

  /** Replace this device's progress with an imported save (after the player confirmed). */
  applyImport(progress: Progress): void {
    this.#progress.replace(progress)
  }
}
