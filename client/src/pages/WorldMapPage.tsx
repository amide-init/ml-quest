import { StarRating } from '@/components/game'
import { ButtonLink, PageHeader } from '@/components/ui'
import { useDocumentTitle, useProgress } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import styles from './WorldMapPage.module.css'

type Release = 'v1' | 'v2' | 'v3'

// Static until the WorldService and level content land (roadmap Phase 1). Order follows PRD "World map and levels".
const WORLDS: readonly { id: number; release: Release }[] = [
  { id: 1, release: 'v1' },
  { id: 2, release: 'v1' },
  { id: 3, release: 'v2' },
  { id: 4, release: 'v2' },
  { id: 5, release: 'v3' },
  { id: 6, release: 'v3' },
]

const worldKey = (id: number, field: 'name' | 'concepts') => `world.${id}.${field}` as MessageKey

// Playable levels per world. Moves to LevelService once more levels exist (roadmap Phase 2).
const PLAYABLE_LEVELS: Readonly<
  Record<number, readonly { id: string; world: number; level: number }[]>
> = {
  1: [{ id: 'w1-l3', world: 1, level: 3 }],
}

export function WorldMapPage() {
  const title = t('map.title')
  useDocumentTitle(title)
  const { bestStars } = useProgress()

  return (
    <div className={styles['page']}>
      <PageHeader title={title} lede={t('map.lede')} />
      <ol className={styles['trail']}>
        {WORLDS.map((world) => {
          const className = [
            styles['world'],
            world.release === 'v1' ? styles['open'] : styles['later'],
            world.id === 1 ? styles['current'] : '',
          ].join(' ')
          return (
            <li key={world.id} className={className}>
              <span className={styles['marker']} aria-hidden="true" />
              <div className={styles['body']}>
                <span className={styles['label']}>{t('map.world.label', { id: world.id })}</span>
                <h2 className={styles['name']}>{t(worldKey(world.id, 'name'))}</h2>
                <p className={styles['concepts']}>{t(worldKey(world.id, 'concepts'))}</p>
                <span className={styles['release']}>{t(`map.release.${world.release}`)}</span>
                {PLAYABLE_LEVELS[world.id] ? (
                  <ul
                    className={styles['levels']}
                    aria-label={t('map.levels.label', { world: t(worldKey(world.id, 'name')) })}
                  >
                    {PLAYABLE_LEVELS[world.id]?.map((level) => {
                      const stars = bestStars(level.id)
                      return (
                        <li key={level.id} className={styles['level']}>
                          <span className={styles['levelName']}>
                            {t('level.label', { world: level.world, level: level.level })}{' '}
                            <strong>{t(`level.${level.id}.title` as MessageKey)}</strong>
                          </span>
                          {stars > 0 ? (
                            <StarRating stars={stars} size="small" />
                          ) : (
                            <span className={styles['label']}>{t('map.level.notPlayed')}</span>
                          )}
                          <ButtonLink
                            to={`/w/${level.world}/l/${level.level}`}
                            variant={stars > 0 ? 'quiet' : 'primary'}
                            size="small"
                          >
                            {stars > 0 ? t('map.level.replay') : t('map.level.play')}
                          </ButtonLink>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
