/**
 * React adapters over services + stores (useLevelSession, useSettings, useProgress).
 * The only UI layer allowed to call useServices(). No business rules here.
 * Do NOT re-export useServices from this barrel: pages and components must not reach services directly.
 * See ARCHITECTURE.md §4.
 */
export { useDocumentPreferences } from './useDocumentPreferences'
export { useDocumentTitle } from './useDocumentTitle'
export { usePrefersReducedMotion } from './usePrefersReducedMotion'
export { useSettings } from './useSettings'
export type { UseSettings } from './useSettings'
