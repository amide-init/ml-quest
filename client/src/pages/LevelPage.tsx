import { useParams } from 'react-router'
import { ButtonLink, PageHeader } from '@/components/ui'
import { DebriefCard, HintPanel, LevelStats, MissionCard, ResultPanel } from '@/components/game'
import { LossLandscapeMap } from '@/components/viz'
import { StepControls } from '@/components/widgets'
import { useDocumentTitle, useLevelSession, type UseLevelSession } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import { NotFoundPage } from './NotFoundPage'
import styles from './LevelPage.module.css'
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
  return game ? (
    <PlayableLevel game={game} world={world} level={level} />
  ) : (
    <LevelPlaceholder world={world} level={level} />
  )
}

/** Level text in the config is locale keys; the schema test guarantees they exist in ui.json. */
const text = (key: string) => t(key as MessageKey)

function PlayableLevel({
  game,
  world,
  level,
}: {
  game: UseLevelSession
  world: number
  level: number
}) {
  const { view } = game
  const { session, snapshot, map } = view
  const config = view.level
  const title = text(config.text.title)
  useDocumentTitle(title)

  const result = session.lastResult
  const phase = session.phase
  const controls = config.controls

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <span className={styles['label']}>{t('level.label', { world, level })}</span>
        <h1 className={styles['title']}>{title}</h1>
      </header>

      <div className={styles['layout']}>
        <LossLandscapeMap
          map={map}
          snapshot={snapshot}
          showPreview={phase === 'playing'}
          label={t('level.map.description', { loss: snapshot.loss.toFixed(3) })}
        />

        <div className={styles['side']}>
          {phase === 'briefing' ? (
            <MissionCard mission={text(config.text.mission)} onStart={game.start} />
          ) : null}

          {phase === 'playing' ? (
            <>
              <p className={styles['mission']}>{text(config.text.mission)}</p>
              <LevelStats
                steps={snapshot.steps}
                budget={controls.stepBudget}
                loss={snapshot.loss}
              />
              <StepControls
                learningRate={snapshot.learningRate}
                min={controls.learningRate.min}
                max={controls.learningRate.max}
                step={controls.learningRate.step}
                disabled={false}
                onCommand={game.dispatch}
              />
            </>
          ) : null}

          {(phase === 'passed' || phase === 'failed') && result ? (
            <ResultPanel
              result={result}
              snapshot={snapshot}
              onRetry={game.retry}
              onContinue={game.openDebrief}
            />
          ) : null}

          {phase === 'debrief' && result ? (
            <DebriefCard
              stars={result.stars}
              body={text(config.text.debrief)}
              unlockedTerm={
                view.reward?.unlockedConcept
                  ? text(`concept.${view.reward.unlockedConcept}.term`)
                  : null
              }
              newBest={view.reward?.newBest ?? false}
              onReplay={game.retry}
            />
          ) : null}

          {phase === 'playing' || phase === 'failed' ? (
            <HintPanel
              unlocked={session.hintsUnlocked}
              hints={config.text.hints.map(text)}
              revealed={session.hintsRevealed}
              onReveal={game.revealHint}
            />
          ) : null}
        </div>
      </div>
    </div>
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
