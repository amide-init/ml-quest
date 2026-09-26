import { Link } from 'react-router'
import { Button, ButtonLink } from '@/components/ui'
import { t } from '@/i18n'
import type { StarCount } from '@/models'
import { StarRating } from './StarRating'
import styles from './Panel.module.css'

interface DebriefCardProps {
  readonly stars: StarCount
  readonly body: string
  /** Display name of a concept card unlocked by this pass, if any. */
  readonly unlockedTerm: string | null
  readonly newBest: boolean
  readonly onReplay: () => void
}

/** Play first, name it after: the debrief gives the idea its real ML name. */
export function DebriefCard({ stars, body, unlockedTerm, newBest, onReplay }: DebriefCardProps) {
  return (
    <section className={styles['panel']}>
      <h2 className={styles['title']}>{t('level.debrief.title')}</h2>
      <StarRating stars={stars} />
      {newBest ? <p className={styles['note']}>{t('level.debrief.newBest')}</p> : null}
      <p>{body}</p>
      {unlockedTerm ? (
        <p className={styles['unlock']}>
          {t('level.debrief.unlocked', { term: unlockedTerm })}{' '}
          <Link to="/codex">{t('level.debrief.codex')}</Link>
        </p>
      ) : null}
      <div className={styles['actions']}>
        <ButtonLink to="/map" variant="primary">
          {t('level.debrief.map')}
        </ButtonLink>
        <Button onClick={onReplay}>{t('level.debrief.replay')}</Button>
      </div>
    </section>
  )
}
