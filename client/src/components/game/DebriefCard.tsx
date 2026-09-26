import { Button, ButtonLink } from '@/components/ui'
import { t } from '@/i18n'
import type { StarCount } from '@/models'
import { StarRating } from './StarRating'
import styles from './Panel.module.css'

interface DebriefCardProps {
  readonly stars: StarCount
  readonly body: string
  readonly onReplay: () => void
}

/** Play first, name it after: the debrief gives the idea its real ML name. */
export function DebriefCard({ stars, body, onReplay }: DebriefCardProps) {
  return (
    <section className={styles['panel']}>
      <h2 className={styles['title']}>{t('level.debrief.title')}</h2>
      <StarRating stars={stars} />
      <p>{body}</p>
      <div className={styles['actions']}>
        <ButtonLink to="/map" variant="primary">
          {t('level.debrief.map')}
        </ButtonLink>
        <Button onClick={onReplay}>{t('level.debrief.replay')}</Button>
      </div>
    </section>
  )
}
