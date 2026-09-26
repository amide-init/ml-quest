import { StarRating, UpdateBanner } from '@/components/game'
import { ButtonLink, PageHeader } from '@/components/ui'
import {
  useAppUpdate,
  useDocumentTitle,
  useLevelCatalog,
  useLevelStatuses,
  useProgress,
  useWorldProgress,
} from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import styles from './WorldMapPage.module.css'

const worldKey = (id: number, field: 'name' | 'concepts') => `world.${id}.${field}` as MessageKey

export function WorldMapPage() {
  const title = t('map.title')
  useDocumentTitle(title)
  const { bestStars } = useProgress()
  const catalog = useLevelCatalog()
  const statuses = useLevelStatuses()
  const update = useAppUpdate()
  const levelsIn = (world: number) => catalog.filter((level) => level.world === world)
  // Only worlds with at least one playable level are listed (later worlds appear as they ship).
  const worlds = useWorldProgress()

  return (
    <div className={styles['page']}>
      {update.ready ? <UpdateBanner onUpdate={update.install} /> : null}
      <PageHeader title={title} lede={t('map.lede')} />
      <ol className={styles['trail']}>
        {worlds.map((world) => {
          const className = [
            styles['world'],
            world.complete ? styles['complete'] : '',
            world.current ? styles['current'] : '',
          ].join(' ')
          return (
            <li key={world.world} className={className}>
              <span className={styles['marker']} aria-hidden="true" />
              <div className={styles['body']}>
                <span className={styles['label']}>{t('map.world.label', { id: world.world })}</span>
                <h2 className={styles['name']}>{t(worldKey(world.world, 'name'))}</h2>
                <p className={styles['concepts']}>{t(worldKey(world.world, 'concepts'))}</p>
                <span className={styles['progress']}>
                  {world.complete
                    ? t('map.world.complete', { stars: world.stars, max: world.maxStars })
                    : t('map.world.progress', {
                        passed: world.passed,
                        levels: world.levels,
                        stars: world.stars,
                        max: world.maxStars,
                      })}
                </span>
                <ul
                  className={styles['levels']}
                  aria-label={t('map.levels.label', { world: t(worldKey(world.world, 'name')) })}
                >
                  {levelsIn(world.world).map((level) => {
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
