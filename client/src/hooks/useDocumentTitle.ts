import { useEffect } from 'react'
import { t } from '@/i18n'

/** Sets the browser tab title, e.g. "Settings – ML Quest". Pass null on the home page. */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    const appName = t('app.name')
    document.title = title ? `${title} – ${appName}` : appName
  }, [title])
}
