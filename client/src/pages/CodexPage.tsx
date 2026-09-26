import { ButtonLink, PageHeader } from '@/components/ui'
import { useDocumentTitle, useLevelCatalog, useProgress } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import styles from './CodexPage.module.css'

/** Concept strings live in ui.json under concept.<id>.*; the content test guarantees they exist. */
const conceptText = (id: string, field: 'term' | 'definition') =>
  t(`concept.${id}.${field}` as MessageKey)

export function CodexPage() {
  const title = t('codex.title')
  useDocumentTitle(title)
  const { progress } = useProgress()
  const catalog = useLevelCatalog()
  const concepts = progress.concepts

  if (concepts.length === 0) {
    return (
      <div className={`${styles['page']} ${styles['empty']}`}>
        <PageHeader title={title} lede={t('codex.empty.body')} />
        <ButtonLink to="/map" variant="primary">
          {t('codex.empty.action')}
        </ButtonLink>
      </div>
    )
  }

  return (
    <div className={styles['page']}>
      <PageHeader title={title} lede={t('codex.lede')} />
      <ul className={styles['cards']}>
        {concepts.map((id) => {
          // The level that teaches this concept, from the level data itself.
          const source = catalog.find((level) => level.concept === id)?.title
          return (
            <li key={id} className={styles['card']}>
              <h2 className={styles['term']}>{conceptText(id, 'term')}</h2>
              <p>{conceptText(id, 'definition')}</p>
              {source ? (
                <p className={styles['source']}>
                  {t('codex.card.source', { level: t(source as MessageKey) })}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
