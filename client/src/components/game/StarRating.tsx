import { t } from '@/i18n'
import type { StarCount } from '@/models'
import styles from './StarRating.module.css'

const STAR_PATH = 'M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z'

interface StarRatingProps {
  readonly stars: StarCount
  readonly size?: 'regular' | 'small'
}

export function StarRating({ stars, size = 'regular' }: StarRatingProps) {
  const className = `${styles['stars']} ${size === 'small' ? styles['small'] : ''}`
  return (
    <span className={className} role="img" aria-label={t('level.result.stars', { stars })}>
      {[1, 2, 3].map((position) => (
        <svg key={position} className={styles['star']} viewBox="0 0 24 24" aria-hidden="true">
          <path
            className={position <= stars ? styles['earned'] : styles['empty']}
            d={STAR_PATH}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  )
}
