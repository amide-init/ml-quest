import { useCallback } from 'react'
import type { Settings, SettingsPatch } from '@/models'
import { useSettingsStore } from '@/stores'
import { useServices } from './useServices'

export interface UseSettings {
  readonly settings: Settings
  /** False when the browser blocks storage and settings reset with the tab. */
  readonly persistent: boolean
  readonly updateSettings: (patch: SettingsPatch) => void
}

export function useSettings(): UseSettings {
  const { settings: settingsService } = useServices()
  const settings = useSettingsStore((state) => state.settings)
  const setSettings = useSettingsStore((state) => state.setSettings)

  const updateSettings = useCallback(
    (patch: SettingsPatch) => setSettings(settingsService.update(patch)),
    [settingsService, setSettings],
  )

  return { settings, persistent: settingsService.persistent, updateSettings }
}
