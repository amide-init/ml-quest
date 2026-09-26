import levels from '@content/locales/en/levels.json'

const strings: Readonly<Record<string, string>> = levels

/**
 * Level text shown only inside a level (missions, hints, debriefs, field notes). It lives in its
 * own locale file so it ships with the lazily loaded level player, not the first load
 * (ARCHITECTURE §9, §11). Only level code may call it, or the strings join the first load
 * (`pnpm size` catches that). Undefined for keys that live in ui.json.
 */
export function levelString(key: string): string | undefined {
  return strings[key]
}
