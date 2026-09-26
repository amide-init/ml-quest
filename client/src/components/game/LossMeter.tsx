import { t } from '@/i18n'
import styles from './LossMeter.module.css'

interface LossMeterProps {
  readonly loss: number
  readonly bestLoss: number
  /** The starting loss sets the scale: a full bar = where the player began. */
  readonly scale: number
}

/** Live loss readout (W1-L2): a shorter bar is better; a tick marks the best so far. */
export function LossMeter({ loss, bestLoss, scale }: LossMeterProps) {
  const share = (value: number) => `${Math.min(Math.max(value / scale, 0.02), 1) * 100}%`
  return (
    <div className={styles['meter']} aria-live="polite">
      <div className={styles['row']}>
        <span className={styles['label']}>{t('level.loss.label')}</span>
        <span className={styles['value']}>{loss.toFixed(2)}</span>
      </div>
      <div className={styles['track']} aria-hidden="true">
        <div className={styles['fill']} style={{ width: share(loss) }} />
        <div className={styles['best']} style={{ left: share(bestLoss) }} />
      </div>
      <span className={styles['note']}>{t('level.loss.best', { loss: bestLoss.toFixed(2) })}</span>
    </div>
  )
}
