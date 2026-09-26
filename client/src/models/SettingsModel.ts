import { z } from 'zod'

export const themePreferenceSchema = z.enum(['system', 'light', 'dark'])
export type ThemePreference = z.infer<typeof themePreferenceSchema>

export const motionPreferenceSchema = z.enum(['system', 'reduced', 'full'])
export type MotionPreference = z.infer<typeof motionPreferenceSchema>

export const localeSchema = z.enum(['en'])
export type Locale = z.infer<typeof localeSchema>

/** Player preferences (PRD F11). Persisted by SettingsRepository. */
export const settingsSchema = z.object({
  theme: themePreferenceSchema,
  motion: motionPreferenceSchema,
  soundEnabled: z.boolean(),
  locale: localeSchema,
})
export type Settings = z.infer<typeof settingsSchema>

export type SettingsPatch = Partial<Settings>

/** Sound stays off until the player turns it on (RULES.md §6). */
export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  motion: 'system',
  soundEnabled: false,
  locale: 'en',
}
