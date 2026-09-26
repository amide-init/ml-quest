import { useParams } from 'react-router'
import { ButtonLink, PageHeader } from '@/components/ui'
import { useDocumentTitle, useLevelSession } from '@/hooks'
import { t } from '@/i18n'
import { BoundaryLevelView } from './level/BoundaryLevelView'
import { CleaningLevelView } from './level/CleaningLevelView'
import { ComplexityLevelView } from './level/ComplexityLevelView'
import { FeatureLevelView } from './level/FeatureLevelView'
import { LandscapeLevelView } from './level/LandscapeLevelView'
import { RegressionLevelView } from './level/RegressionLevelView'
import { ScalingLevelView } from './level/ScalingLevelView'
import { SigmoidLevelView } from './level/SigmoidLevelView'
import { TrainingLevelView } from './level/TrainingLevelView'
import { NotFoundPage } from './NotFoundPage'
import noticeStyles from './NoticePage.module.css'

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
  const levelId = `w${world}-l${level}`
  // key: a different level gets a fresh session.
  return <LevelScreen key={levelId} levelId={levelId} world={world} level={level} />
}

function LevelScreen({ levelId, world, level }: { levelId: string; world: number; level: number }) {
  const game = useLevelSession(levelId)
  if (!game) {
    return <LevelPlaceholder world={world} level={level} />
  }
  const { scene, snapshot } = game.view
  if (scene.kind === 'landscape' && snapshot.kind === 'landscape') {
    return (
      <LandscapeLevelView
        game={game}
        scene={scene}
        snapshot={snapshot}
        world={world}
        level={level}
      />
    )
  }
  if (scene.kind === 'regression' && snapshot.kind === 'regression') {
    return (
      <RegressionLevelView
        game={game}
        scene={scene}
        snapshot={snapshot}
        world={world}
        level={level}
      />
    )
  }
  if (scene.kind === 'training' && snapshot.kind === 'training') {
    return (
      <TrainingLevelView
        game={game}
        scene={scene}
        snapshot={snapshot}
        world={world}
        level={level}
      />
    )
  }
  if (scene.kind === 'cleaning' && snapshot.kind === 'cleaning') {
    return (
      <CleaningLevelView
        game={game}
        scene={scene}
        snapshot={snapshot}
        world={world}
        level={level}
      />
    )
  }
  if (scene.kind === 'scaling' && snapshot.kind === 'scaling') {
    return (
      <ScalingLevelView game={game} scene={scene} snapshot={snapshot} world={world} level={level} />
    )
  }
  if (scene.kind === 'boundary' && snapshot.kind === 'boundary') {
    return (
      <BoundaryLevelView
        game={game}
        scene={scene}
        snapshot={snapshot}
        world={world}
        level={level}
      />
    )
  }
  if (scene.kind === 'sigmoid' && snapshot.kind === 'sigmoid') {
    return (
      <SigmoidLevelView game={game} scene={scene} snapshot={snapshot} world={world} level={level} />
    )
  }
  if (scene.kind === 'features' && snapshot.kind === 'features') {
    return (
      <FeatureLevelView game={game} scene={scene} snapshot={snapshot} world={world} level={level} />
    )
  }
  if (scene.kind === 'complexity' && snapshot.kind === 'complexity') {
    return (
      <ComplexityLevelView
        game={game}
        scene={scene}
        snapshot={snapshot}
        world={world}
        level={level}
      />
    )
  }
  throw new Error(
    `Level ${levelId}: scene "${scene.kind}" does not match snapshot "${snapshot.kind}"`,
  )
}

function LevelPlaceholder({ world, level }: { world: number; level: number }) {
  useDocumentTitle(t('level.label', { world, level }))

  return (
    <div className={noticeStyles['page']}>
      <PageHeader title={t('level.building.title')} lede={t('level.building.body')} />
      <ButtonLink to="/map">{t('level.back')}</ButtonLink>
    </div>
  )
}
