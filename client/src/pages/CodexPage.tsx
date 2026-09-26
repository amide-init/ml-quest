import { ButtonLink, PageHeader } from '@/components/ui'
import { useDocumentTitle } from '@/hooks'
import { t } from '@/i18n'
import styles from './NoticePage.module.css'

export function CodexPage() {
  const title = t('codex.title')
  useDocumentTitle(title)

  return (
    <div className={styles['page']}>
      <PageHeader title={title} lede={t('codex.empty.body')} />
      <ButtonLink to="/map" variant="primary">
        {t('codex.empty.action')}
      </ButtonLink>
    </div>
  )
}
