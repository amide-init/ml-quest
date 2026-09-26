import { ButtonLink, PageHeader } from '@/components/ui'
import { useDocumentTitle } from '@/hooks'
import { t } from '@/i18n'
import styles from './NoticePage.module.css'

export function NotFoundPage() {
  const title = t('notFound.title')
  useDocumentTitle(title)

  return (
    <div className={styles['page']}>
      <PageHeader title={title} lede={t('notFound.body')} />
      <ButtonLink to="/map" variant="primary">
        {t('notFound.action')}
      </ButtonLink>
    </div>
  )
}
