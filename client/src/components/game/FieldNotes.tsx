import { t } from '@/i18n'
import styles from './FieldNotes.module.css'

interface FieldNotesProps {
  /** The concept's name, e.g. "Regularization". */
  readonly term: string
  readonly idea: string
  readonly controls: string
  readonly reading: string
}

/**
 * Optional reading for a level (closed by default, so "play first, name it after" stays the
 * default path): the idea, what the controls do, and how to read the result. It never gives the
 * answer, so opening it costs no stars, unlike hints.
 */
export function FieldNotes({ term, idea, controls, reading }: FieldNotesProps) {
  return (
    <details className={styles['notes']}>
      <summary className={styles['summary']}>
        <span className={styles['title']}>{t('level.notes.summary', { term })}</span>
        <span className={styles['note']}>{t('level.notes.free')}</span>
      </summary>
      <div className={styles['body']}>
        <h3 className={styles['heading']}>{t('level.notes.idea')}</h3>
        <p>{idea}</p>
        <h3 className={styles['heading']}>{t('level.notes.controls')}</h3>
        <p>{controls}</p>
        <h3 className={styles['heading']}>{t('level.notes.reading')}</h3>
        <p>{reading}</p>
      </div>
    </details>
  )
}
