import { StarRating, UpdateBanner } from '@/components/game'
import { ButtonLink, PageHeader } from '@/components/ui'
import {
  useAppUpdate,
  useDocumentTitle,
  useLevelCatalog,
  useLevelStatuses,
  useProgress,
} from '@/hooks'
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

export function WorldMapPage() {
  const title = t('map.title')
  useDocumentTitle(title)
  const { bestStars } = useProgress()
  const catalog = useLevelCatalog()
  const statuses = useLevelStatuses()
  const update = useAppUpdate()
  const levelsIn = (world: number) => catalog.filter((level) => level.world === world)
  // A world shows up on the map once it has at least one playable level.
  const worlds = WORLDS.filter((world) => levelsIn(world.id).length > 0)

  return (
    <div className={styles['page']}>
      {update.ready ? <UpdateBanner onUpdate={update.install} /> : null}
      <PageHeader title={title} lede={t('map.lede')} />
      <ol className={styles['trail']}>
        {worlds.map((world) => {
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
                <ul
                  className={styles['levels']}
                  aria-label={t('map.levels.label', { world: t(worldKey(world.id, 'name')) })}
                >
                  {levelsIn(world.id).map((level) => {
                    const stars = bestStars(level.id)
                    const requires = statuses[level.id]?.requires ?? null
                    return (
                      <li
                        key={level.id}
                        className={[styles['level'], requires ? styles['locked'] : ''].join(' ')}
                      >
                        <span className={styles['levelName']}>
                          {t('level.label', { world: level.world, level: level.level })}{' '}
                          <strong>{t(level.title as MessageKey)}</strong>
                        </span>
                        {requires ? (
                          <span className={styles['label']}>
                            {t('map.level.locked', {
                              level: t('level.label', {
                                world: requires.world,
                                level: requires.level,
                              }),
                            })}
                          </span>
                        ) : (
                          <>
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
                          </>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
