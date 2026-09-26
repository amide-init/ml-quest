import { Button } from '@/components/ui'
import { t } from '@/i18n'
import styles from './Panel.module.css'

interface MissionCardProps {
  readonly mission: string
  readonly onStart: () => void
}

/** The briefing: one goal in plain words, then play. */
export function MissionCard({ mission, onStart }: MissionCardProps) {
  return (
    <section className={styles['panel']}>
      <p>{mission}</p>
      <div className={styles['actions']}>
        <Button variant="primary" onClick={onStart}>
          {t('level.start')}
        </Button>
      </div>
    </section>
  )
}
