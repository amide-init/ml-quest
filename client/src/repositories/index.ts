/**
 * Data access only. No business rules.
 * - Interfaces live here at the top level: XxxRepository.ts (exported from this barrel).
 * - Implementations live in subfolders by source: local-storage/, bundled/, in-memory/ (never exported here).
 *   Only app/Container.ts (the composition root) and tests import implementations.
 * - migrations/ holds versioned migrations for persisted data.
 * See ARCHITECTURE.md §4.
 */
export type { LevelRepository } from './LevelRepository'
export type { SettingsRepository } from './SettingsRepository'
