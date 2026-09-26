import en from '@content/locales/en/ui.json'

/** Every UI string key. Adding a string to ui.json makes it available here with type checking. */
export type MessageKey = keyof typeof en

export type MessageParams = Readonly<Record<string, string | number>>

const PLACEHOLDER = /\{(\w+)\}/g

/**
 * Look up a player-facing string and fill `{placeholders}`.
 * Only English exists today; locale switching arrives with a second language (PRD F14).
 */
export function t(key: MessageKey, params?: MessageParams): string {
  const message: string = en[key]
  if (!params) {
    return message
  }
  return message.replace(PLACEHOLDER, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}
