import { useParams } from 'react-router'
import { ButtonLink, PageHeader } from '@/components/ui'
import { useDocumentTitle } from '@/hooks'
import { t } from '@/i18n'
import { NotFoundPage } from './NotFoundPage'
import styles from './NoticePage.module.css'

const WORLD_COUNT = 6
const LEVELS_PER_WORLD = 8

/** Route params are strings from the URL; accept only whole numbers in range. */
function parseIndex(value: string | undefined, max: number): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null
  }
  const index = Number(value)
  return index >= 1 && index <= max ? index : null
}

export function LevelPage() {
  const params = useParams()
  const world = parseIndex(params['world'], WORLD_COUNT)
  const level = parseIndex(params['level'], LEVELS_PER_WORLD)

  if (world === null || level === null) {
    return <NotFoundPage />
  }
  return <LevelPlaceholder world={world} level={level} />
}

function LevelPlaceholder({ world, level }: { world: number; level: number }) {
  useDocumentTitle(t('level.title', { world, level }))

  return (
    <div className={styles['page']}>
      <PageHeader title={t('level.building.title')} lede={t('level.building.body')} />
      <ButtonLink to="/map">{t('level.back')}</ButtonLink>
    </div>
  )
}
