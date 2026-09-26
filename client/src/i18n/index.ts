/**
 * Translation loading and the typed t() function.
 * See ARCHITECTURE.md §4 and §9.
 */
export { t } from './Translate'
export type { MessageKey, MessageParams } from './Translate'
// Tree-shaken out of the entry chunk: only the lazily loaded level player calls it.
export { levelString } from './LevelStrings'
