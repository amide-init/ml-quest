import { t, type MessageKey } from '@/i18n'

/** Level text in the config is locale keys; the content test guarantees they exist in ui.json. */
export const levelText = (key: string) => t(key as MessageKey)
