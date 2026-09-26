import { create } from 'zustand'
import { DEFAULT_SETTINGS, type Settings } from '@/models'

interface SettingsState {
  readonly settings: Settings
  readonly setSettings: (settings: Settings) => void
}

/** Reactive copy of the settings for rendering. Changes go through SettingsService (see useSettings). */
export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: DEFAULT_SETTINGS,
  setSettings: (settings) => set({ settings }),
}))
