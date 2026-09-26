import { Button } from '@/components/ui'
import { t } from '@/i18n'
import styles from './Panel.module.css'

interface HintPanelProps {
  readonly unlocked: boolean
  /** Texts of all three tiers; only the first `revealed` are shown. */
  readonly hints: readonly string[]
  readonly revealed: number
  readonly onReveal: () => void
}

/** Three hint tiers: nudge, concept, near-solution. Using one caps the level at 2 stars. */
export function HintPanel({ unlocked, hints, revealed, onReveal }: HintPanelProps) {
  const canReveal = unlocked && revealed < hints.length
  return (
    <section className={styles['panel']} aria-labelledby="hints-title">
      <h2 id="hints-title" className={styles['title']}>
        {t('level.hints.title')}
      </h2>
      {revealed > 0 ? (
        <ol className={styles['list']}>
          {hints.slice(0, revealed).map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ol>
      ) : null}
      {unlocked ? (
        canReveal ? (
          <>
            {revealed === 0 ? <p className={styles['note']}>{t('level.hints.cost')}</p> : null}
            <div className={styles['actions']}>
              <Button size="small" onClick={onReveal}>
                {revealed === 0 ? t('level.hints.reveal') : t('level.hints.revealNext')}
              </Button>
            </div>
          </>
        ) : null
      ) : (
        <p className={styles['note']}>{t('level.hints.locked')}</p>
      )}
    </section>
  )
}
