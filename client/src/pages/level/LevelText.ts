import { levelString, t, type MessageKey } from '@/i18n'

/**
 * Level text in the config is locale keys: briefing text from levels.json (loaded with the level
 * chunk), titles and concepts from ui.json. The content test guarantees every key exists.
 */
export const levelText = (key: string) => levelString(key) ?? t(key as MessageKey)
