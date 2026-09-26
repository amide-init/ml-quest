import type { Services } from '@/services'
import { useSettingsStore } from '@/stores'

/** Loads persisted state into the stores before the first render, so the right theme shows immediately. */
export function hydrateStores(services: Services): void {
  useSettingsStore.getState().setSettings(services.settings.getSettings())
}
