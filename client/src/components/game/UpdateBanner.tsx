import { Button } from '@/components/ui'
import { t } from '@/i18n'
import styles from './UpdateBanner.module.css'

interface UpdateBannerProps {
  readonly onUpdate: () => void
}

/** A new version is ready. Offered on the map, where reloading can't interrupt a level. */
export function UpdateBanner({ onUpdate }: UpdateBannerProps) {
  return (
    <div className={styles['banner']} role="status">
      <p>{t('update.ready')}</p>
      <Button variant="primary" size="small" onClick={onUpdate}>
        {t('update.install')}
      </Button>
    </div>
  )
}
