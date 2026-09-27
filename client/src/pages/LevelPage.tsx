import { useParams } from 'react-router'
import { ButtonLink, PageHeader } from '@/components/ui'
import { useDocumentTitle, useLevelSession, useLevelStatuses } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import type { LevelSummary } from '@/models'
import { BoundaryLevelView } from './level/BoundaryLevelView'
import { CleaningLevelView } from './level/CleaningLevelView'
import { ComplexityLevelView } from './level/ComplexityLevelView'
import { FeatureLevelView } from './level/FeatureLevelView'
import { LandscapeLevelView } from './level/LandscapeLevelView'
import { RegressionLevelView } from './level/RegressionLevelView'
import { ScalingLevelView } from './level/ScalingLevelView'
import { SigmoidLevelView } from './level/SigmoidLevelView'
import { SplitLevelView } from './level/SplitLevelView'
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
  return <LevelGate key={levelId} levelId={levelId} world={world} level={level} />
}

interface LevelProps {
  readonly levelId: string
  readonly world: number
  readonly level: number
}

/** A locked level says which level opens it instead of starting a session (PRD F1). */
function LevelGate(props: LevelProps) {
  const status = useLevelStatuses()[props.levelId]
  return status?.requires ? (
    <LevelLocked requires={status.requires} playNext={status.playNext ?? status.requires} />
  ) : (
    <LevelScreen {...props} />
  )
}

function LevelLocked({ requires, playNext }: { requires: LevelSummary; playNext: LevelSummary }) {
  useDocumentTitle(t('level.locked.title'))
  const label = t('level.label', { world: requires.world, level: requires.level })
  const nextLabel = t('level.label', { world: playNext.world, level: playNext.level })

  return (
    <div className={noticeStyles['page']}>
      <PageHeader
        title={t('level.locked.title')}
        lede={t('level.locked.body', { level: label, title: t(requires.title as MessageKey) })}
      />
      <ButtonLink to={`/w/${playNext.world}/l/${playNext.level}`} variant="primary">
        {t('level.locked.play', { level: nextLabel })}
      </ButtonLink>{' '}
      <ButtonLink to="/map" variant="quiet">
        {t('level.back')}
      </ButtonLink>
    </div>
  )
}

function LevelScreen({ levelId, world, level }: LevelProps) {
  const game = useLevelSession(levelId)
  if (game === 'loading') {
    return (
      <p className={noticeStyles['page']} role="status">
        {t('app.loading')}
      </p>
    )
  }
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
  if (scene.kind === 'splits' && snapshot.kind === 'splits') {
    return (
      <SplitLevelView game={game} scene={scene} snapshot={snapshot} world={world} level={level} />
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
