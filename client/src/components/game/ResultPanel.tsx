import { Button } from '@/components/ui'
import { t, type MessageKey } from '@/i18n'
import type { ConditionFailure, EvalResult } from '@/models'
import { StarRating } from './StarRating'
import styles from './Panel.module.css'

interface ResultPanelProps {
  readonly result: EvalResult
  /** Headline and explanation, chosen by the level screen (it knows the level's vocabulary). */
  readonly title: string
  readonly body: string
  readonly onRetry: () => void
  readonly onContinue: () => void
  /** Phrase the next-star goal in the level's vocabulary; defaults to level.result.next.<metric>. */
  readonly describeNext?: (condition: ConditionFailure) => string
}

const defaultNext = (condition: ConditionFailure) =>
  t(`level.result.next.${condition.metric}` as MessageKey, { value: condition.expected })

/** Pass or fail, stars, and what to do next. Failures say what went wrong, not just "failed". */
export function ResultPanel({
  result,
  title,
  body,
  onRetry,
  onContinue,
  describeNext = defaultNext,
}: ResultPanelProps) {
  const next = result.passed ? result.nextStarConditions[0] : undefined

  return (
    <section className={styles['panel']} aria-live="polite">
      <h2 className={styles['title']}>{title}</h2>
      {result.passed ? <StarRating stars={result.stars} /> : null}
      <p className={styles['body']}>{body}</p>
      {next ? <p className={styles['note']}>{describeNext(next)}</p> : null}
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
