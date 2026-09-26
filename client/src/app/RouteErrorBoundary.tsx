import { useRouteError } from 'react-router'
import { Button, PageHeader } from '@/components/ui'
import { t } from '@/i18n'

/** Shown when a screen throws while rendering. Settings and progress live in storage, so a reload is safe. */
export function RouteErrorBoundary() {
  const error = useRouteError()
  console.error(error)

  return (
    <main
      style={{
        maxWidth: 'var(--page-width)',
        margin: '0 auto',
        padding: 'var(--space-16) var(--gutter)',
      }}
    >
      <PageHeader title={t('error.title')} lede={t('error.body')} />
      <Button variant="primary" onClick={() => window.location.reload()}>
        {t('error.action')}
      </Button>
    </main>
  )
}
