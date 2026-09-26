import { useEffect } from 'react'
import { useSettingsStore } from '@/stores'

/**
 * Mirrors theme and motion choices onto <html data-theme data-motion> so CSS tokens can react.
 * "system" removes the attribute and lets the media queries in index.css decide.
 */
export function useDocumentPreferences(): void {
  const theme = useSettingsStore((state) => state.settings.theme)
  const motion = useSettingsStore((state) => state.settings.motion)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      delete root.dataset['theme']
    } else {
      root.dataset['theme'] = theme
    }
    if (motion === 'system') {
      delete root.dataset['motion']
    } else {
      root.dataset['motion'] = motion
    }
  }, [theme, motion])
}
