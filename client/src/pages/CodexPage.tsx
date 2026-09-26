import { ButtonLink, PageHeader } from '@/components/ui'
import { useDocumentTitle, useProgress } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import styles from './CodexPage.module.css'

/** Concept strings live in ui.json under concept.<id>.*; the content test guarantees they exist. */
const conceptText = (id: string, field: 'term' | 'definition') =>
  t(`concept.${id}.${field}` as MessageKey)

// Which level unlocks each concept. Moves into content with the Codex pipeline (ARCHITECTURE §9).
const CONCEPT_SOURCE: Readonly<Record<string, MessageKey>> = {
  'linear-regression': 'level.w1-l1.title',
  'loss-function': 'level.w1-l2.title',
  'gradient-descent': 'level.w1-l3.title',
  'learning-rate': 'level.w1-l4.title',
  'local-minimum': 'level.w1-l5.title',
  outlier: 'level.w1-l6.title',
  'feature-scaling': 'level.w1-l7.title',
  preprocessing: 'level.w1-l8.title',
  classification: 'level.w2-l1.title',
  sigmoid: 'level.w2-l2.title',
  'feature-engineering': 'level.w2-l3.title',
  overfitting: 'level.w2-l4.title',
  regularization: 'level.w2-l5.title',
  'class-imbalance': 'level.w2-l6.title',
}

export function CodexPage() {
  const title = t('codex.title')
  useDocumentTitle(title)
  const { progress } = useProgress()
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
          const source = CONCEPT_SOURCE[id]
          return (
            <li key={id} className={styles['card']}>
              <h2 className={styles['term']}>{conceptText(id, 'term')}</h2>
              <p>{conceptText(id, 'definition')}</p>
              {source ? (
                <p className={styles['source']}>{t('codex.card.source', { level: t(source) })}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
