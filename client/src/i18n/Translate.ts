import en from '@content/locales/en/ui.json'

/** Every UI string key. Adding a string to ui.json makes it available here with type checking. */
export type MessageKey = keyof typeof en

export type MessageParams = Readonly<Record<string, string | number>>

const PLACEHOLDER = /\{(\w+)\}/g
/** ICU-style plural: {count, plural, one {# step} other {# steps}}. "#" becomes the number. */
const PLURAL = /\{(\w+), plural, one \{([^{}]*)\} other \{([^{}]*)\}\}/g
const pluralRules = new Intl.PluralRules('en')

/**
 * Look up a player-facing string and fill `{placeholders}`.
 * Only English exists today; locale switching arrives with a second language (PRD F14).
 */
export function t(key: MessageKey, params?: MessageParams): string {
  const message: string = en[key]
  if (!params) {
    return message
  }
  return message
    .replace(PLURAL, (match, name: string, one: string, other: string) => {
      const value = params[name]
      if (value === undefined) {
        return match
      }
      const form = pluralRules.select(Number(value)) === 'one' ? one : other
      return form.replaceAll('#', String(value))
    })
    .replace(PLACEHOLDER, (match, name: string) => {
      const value = params[name]
      return value === undefined ? match : String(value)
    })
}
