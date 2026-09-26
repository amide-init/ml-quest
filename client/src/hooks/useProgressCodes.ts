import { useMemo } from 'react'
import type { Progress, ProgressCodeRead } from '@/models'
import { copyText } from '@/platform'
import { useServices } from './useServices'

export interface UseProgressCodes {
  /** This device's progress as a code (async: compression runs off the critical path). */
  readonly createCode: () => Promise<string>
  /** Checks a pasted code and, if it's good, previews it against this device's progress. */
  readonly readCode: (code: string) => Promise<ProgressCodeRead>
  /** Replaces this device's progress with an imported one; the map and Codex update at once. */
  readonly applyImport: (progress: Progress) => void
  /** False when the browser won't allow clipboard access. */
  readonly copy: (text: string) => Promise<boolean>
}

/** Export/import of progress codes (PRD F8), for the Settings page. */
export function useProgressCodes(): UseProgressCodes {
  const { progressCodes } = useServices()
  return useMemo(
    () => ({
      createCode: () => progressCodes.createCode(),
      readCode: (code) => progressCodes.readCode(code),
      applyImport: (progress) => progressCodes.applyImport(progress),
      copy: copyText,
    }),
    [progressCodes],
  )
}
