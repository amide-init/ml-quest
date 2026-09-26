import { Button } from '@/components/ui'
import { t, type MessageKey } from '@/i18n'
import type { EvalResult, LandscapeSnapshot } from '@/models'
import { StarRating } from './StarRating'
import styles from './Panel.module.css'

interface ResultPanelProps {
  readonly result: EvalResult
  readonly snapshot: LandscapeSnapshot
  readonly onRetry: () => void
  readonly onContinue: () => void
}

/** Pass or fail, stars, and what to do next. Failures say what went wrong, not just "failed". */
export function ResultPanel({ result, snapshot, onRetry, onContinue }: ResultPanelProps) {
  const steps = result.metrics.steps
  const diverged = snapshot.status === 'diverged'
  const title = result.passed
    ? t('level.result.passed.title')
    : diverged
      ? t('level.result.diverged.title')
      : t('level.result.budget.title')
  const body = result.passed
    ? t('level.result.passed.body', { steps })
    : diverged
      ? t('level.result.diverged.body')
      : t('level.result.budget.body', {
          steps,
          distance: result.metrics.distance_to_global_min.toFixed(2),
        })
  const next = result.passed ? result.nextStarConditions[0] : undefined

  return (
    <section className={styles['panel']} aria-live="polite">
      <h2 className={styles['title']}>{title}</h2>
      {result.passed ? <StarRating stars={result.stars} /> : null}
      <p className={styles['body']}>{body}</p>
      {next ? (
        <p className={styles['note']}>
          {t(`level.result.next.${next.metric}` as MessageKey, { value: next.expected })}
        </p>
      ) : null}
      {result.cappedByHints ? <p className={styles['note']}>{t('level.result.capped')}</p> : null}
      <div className={styles['actions']}>
        {result.passed ? (
          <Button variant="primary" onClick={onContinue}>
            {t('level.continue')}
          </Button>
        ) : null}
        <Button variant={result.passed ? 'quiet' : 'primary'} onClick={onRetry}>
          {t('level.retry')}
        </Button>
      </div>
    </section>
  )
}
