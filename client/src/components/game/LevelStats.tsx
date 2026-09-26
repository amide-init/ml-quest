import { t } from '@/i18n'
import styles from './Panel.module.css'

interface LevelStatsProps {
  readonly steps: number
  readonly budget: number
  readonly loss: number
}

export function LevelStats({ steps, budget, loss }: LevelStatsProps) {
  const lowOnSteps = budget - steps <= 3
  return (
    <div className={styles['stats']} aria-live="polite">
      <span className={`${styles['stat']} ${lowOnSteps ? styles['statWarning'] : ''}`}>
        {t('level.stats.steps', { used: steps, budget })}
      </span>
      <span className={styles['stat']}>{t('level.stats.loss', { loss: loss.toFixed(3) })}</span>
    </div>
  )
}
