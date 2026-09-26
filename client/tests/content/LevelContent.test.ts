/**
 * Content checks for every bundled level (the start of `levels:validate`, ARCHITECTURE §5.5):
 * the schema is enforced by the repository, and every text key must exist in the English strings
 * (ui.json, or levels.json for the text shown only inside a level).
 */
import { describe, expect, it } from 'vitest'
import levelStrings from '@content/locales/en/levels.json'
import en from '@content/locales/en/ui.json'
import { BundledLevelRepository } from '@/repositories/bundled/BundledLevelRepository'

const repository = new BundledLevelRepository()
// Level briefing text lives in levels.json (lazy level chunk); titles and concepts in ui.json.
const strings: Record<string, string> = { ...en, ...levelStrings }

describe('level content', () => {
  it('every level file passes the schema', () => {
    expect(repository.invalid).toEqual([])
    expect(repository.list().length).toBeGreaterThan(0)
  })

  for (const level of repository.list()) {
    it(`${level.id}: every text and concept key exists in ui.json`, () => {
      const { title, mission, hints, debrief, notes } = level.text
      const conceptKeys = [
        `concept.${level.text.concept}.term`,
        `concept.${level.text.concept}.definition`,
      ]
      const featureKeys =
        level.algorithm.id === 'multi-linear-regression' ? level.algorithm.featureLabels : []
      const noteKeys = [notes.idea, notes.controls, notes.reading]
      const missing = [
        title,
        mission,
        ...hints,
        debrief,
        ...noteKeys,
        ...conceptKeys,
        ...featureKeys,
      ].filter((key) => !(key in strings))
      expect(missing).toEqual([])
    })
  }
})
