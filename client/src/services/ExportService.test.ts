import { describe, expect, it } from 'vitest'
import { crc32, toBase64Url } from '@/lib'
import type { Progress, StarCount } from '@/models'
import { InMemoryProgressRepository } from '@/repositories/in-memory/InMemoryProgressRepository'
import { ExportService } from './ExportService'
import { ProgressService } from './ProgressService'

/** Every v1 level passed with 3 stars and its concept unlocked: the largest v1 save. */
const FULL: Progress = {
  levels: Object.fromEntries(
    [1, 2].flatMap((world) =>
      [1, 2, 3, 4, 5, 6, 7, 8].map((level) => [
        `w${world}-l${level}`,
        { bestStars: 3 as StarCount },
      ]),
    ),
  ),
  concepts: [
    'linear-regression',
    'loss-function',
    'gradient-descent',
    'learning-rate',
    'local-minima',
    'outliers',
    'feature-scaling',
    'training-loop',
    'decision-boundary',
    'sigmoid',
    'feature-engineering',
    'overfitting',
    'regularization',
    'class-imbalance',
    'precision-recall',
    'f1-score',
  ],
}

const device = (progress?: Progress) => {
  const service = new ProgressService(new InMemoryProgressRepository())
  if (progress) service.replace(progress)
  return { progress: service, codes: new ExportService(service) }
}

describe('ExportService', () => {
  it('round-trips a full save through a code of a copyable length', async () => {
    const code = await device(FULL).codes.createCode()
    expect(code).toMatch(/^MLQ1-[A-Za-z0-9_-]+-[0-9a-f]{8}$/)
    expect(code.length).toBeLessThan(400)
    const read = await device().codes.readCode(code)
    expect(read).toEqual({
      ok: true,
      progress: FULL,
      incoming: { stars: 48, levels: 16, concepts: 16 },
      current: { stars: 0, levels: 0, concepts: 0 },
    })
  })

  it('ignores whitespace and line breaks picked up by copy-paste', async () => {
    const code = await device(FULL).codes.createCode()
    const wrapped = `  ${code.slice(0, 40)}\n${code.slice(40, 90)} ${code.slice(90)}\n`
    expect((await device().codes.readCode(wrapped)).ok).toBe(true)
  })

  it('catches a truncated or edited code with the checksum', async () => {
    const code = await device(FULL).codes.createCode()
    // The body is base64url, which itself uses '-': the checksum is the part after the last one.
    const cut = code.lastIndexOf('-')
    const edited = `${code.slice(0, cut - 1)}${code[cut - 1] === 'A' ? 'B' : 'A'}${code.slice(cut)}`
    expect(await device().codes.readCode(edited)).toEqual({ ok: false, problem: 'checksum' })
    // Cut off mid-way: the end (and its checksum) is gone, which reads as incomplete, not foreign.
    expect(await device().codes.readCode(code.slice(0, 60))).toEqual({
      ok: false,
      problem: 'checksum',
    })
  })

  it('names the problem: not a code, a newer version, or contents that fail validation', async () => {
    const { codes } = device()
    expect(await codes.readCode('hello')).toEqual({ ok: false, problem: 'format' })
    expect(await codes.readCode('MLQ2-abc-00000000')).toEqual({ ok: false, problem: 'newer' })
    // A well-formed code whose contents are not valid progress (stars out of range).
    const json = JSON.stringify({
      v: 1,
      data: { levels: { 'w1-l1': { bestStars: 9 } }, concepts: [] },
    })
    const body = toBase64Url(Uint8Array.of(0, ...new TextEncoder().encode(json)))
    expect(await codes.readCode(`MLQ1-${body}-${crc32(body)}`)).toEqual({
      ok: false,
      problem: 'unreadable',
    })
  })

  it('replaces this device’s progress only when the import is applied', async () => {
    const code = await device(FULL).codes.createCode()
    const here = device({ levels: { 'w1-l1': { bestStars: 1 } }, concepts: ['linear-regression'] })
    const read = await here.codes.readCode(code)
    expect(read.ok && read.current).toEqual({ stars: 1, levels: 1, concepts: 1 })
    expect(here.progress.bestStars('w2-l8')).toBe(0)
    if (read.ok) here.codes.applyImport(read.progress)
    expect(here.progress.bestStars('w2-l8')).toBe(3)
  })
})
