import { t } from '@/i18n'
import styles from './AppLayout.module.css'

/** Shown while a lazily loaded screen (the level player) downloads on first visit. */
export function RouteFallback() {
  return (
    <p className={styles['loading']} role="status">
      {t('app.loading')}
    </p>
  )
}
