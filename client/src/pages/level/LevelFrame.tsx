import type { ReactNode } from 'react'
import { DebriefCard, HintPanel, MissionCard, ResultPanel } from '@/components/game'
import { useDocumentTitle, type UseLevelSession } from '@/hooks'
import { t } from '@/i18n'
import { levelText } from './LevelText'
import styles from './LevelFrame.module.css'

interface LevelFrameProps {
  readonly game: UseLevelSession
  readonly world: number
  readonly level: number
  /** The level's main visual (map, plot…). */
  readonly visual: ReactNode
  /** Controls shown while playing. */
  readonly controls: ReactNode
  /** Result wording, in the level's own vocabulary. Null while the result isn't ready to show. */
  readonly resultText: { readonly title: string; readonly body: string } | null
  /** Shown instead of the result while it isn't ready yet (e.g. a training run is replaying). */
  readonly pending?: ReactNode
}

/** What every level shares: header, briefing, result, hints and debrief, driven by the session phase. */
export function LevelFrame({
  game,
  world,
  level,
  visual,
  controls,
  resultText,
  pending,
}: LevelFrameProps) {
  const { session, reward } = game.view
  const config = game.view.level
  const title = levelText(config.text.title)
  useDocumentTitle(title)
  const { phase, lastResult: result } = session

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <span className={styles['label']}>{t('level.label', { world, level })}</span>
        <h1 className={styles['title']}>{title}</h1>
      </header>

      <div className={styles['layout']}>
        {visual}

        <div className={styles['side']}>
          {phase === 'briefing' ? (
            <MissionCard mission={levelText(config.text.mission)} onStart={game.start} />
          ) : null}

          {phase === 'playing' ? (
            <>
              <p className={styles['mission']}>{levelText(config.text.mission)}</p>
              {controls}
            </>
          ) : null}

          {(phase === 'passed' || phase === 'failed') && !resultText ? pending : null}

          {(phase === 'passed' || phase === 'failed') && result && resultText ? (
            <ResultPanel
              result={result}
              title={resultText.title}
              body={resultText.body}
              onRetry={game.retry}
              onContinue={game.openDebrief}
            />
          ) : null}

          {phase === 'debrief' && result ? (
            <DebriefCard
              stars={result.stars}
              body={levelText(config.text.debrief)}
              unlockedTerm={
                reward?.unlockedConcept ? levelText(`concept.${reward.unlockedConcept}.term`) : null
              }
              newBest={reward?.newBest ?? false}
              onReplay={game.retry}
            />
          ) : null}

          {phase === 'playing' || phase === 'failed' ? (
            <HintPanel
              unlocked={session.hintsUnlocked}
              hints={config.text.hints.map(levelText)}
              revealed={session.hintsRevealed}
              onReveal={game.revealHint}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
