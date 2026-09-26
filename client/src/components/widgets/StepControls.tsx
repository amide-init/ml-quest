import { useId } from 'react'
import { Button } from '@/components/ui'
import { t } from '@/i18n'
import type { Command } from '@/models'
import styles from './StepControls.module.css'

interface StepControlsProps {
  readonly learningRate: number
  readonly min: number
  readonly max: number
  readonly step: number
  readonly disabled: boolean
  /** Widgets never call services: they emit commands (ARCHITECTURE §3). */
  readonly onCommand: (command: Command) => void
}

/** Step size (learning rate) slider plus the Step button, for manual gradient descent. */
export function StepControls({
  learningRate,
  min,
  max,
  step,
  disabled,
  onCommand,
}: StepControlsProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const decimals = Math.max(0, -Math.floor(Math.log10(step)))

  return (
    <div className={styles['controls']}>
      <div className={styles['field']}>
        <div className={styles['labelRow']}>
          <label htmlFor={id} className={styles['label']}>
            {t('level.stepSize.label')}
          </label>
          <output htmlFor={id} className={styles['value']}>
            {learningRate.toFixed(decimals)}
          </output>
        </div>
        <input
          id={id}
          className={styles['range']}
          type="range"
          min={min}
          max={max}
          step={step}
          value={learningRate}
          disabled={disabled}
          aria-describedby={hintId}
          onChange={(event) =>
            onCommand({
              type: 'set-hyperparameter',
              name: 'learningRate',
              value: Number(event.target.value),
            })
          }
        />
        <p id={hintId} className={styles['hint']}>
          {t('level.stepSize.hint')}
        </p>
      </div>
      <Button variant="primary" disabled={disabled} onClick={() => onCommand({ type: 'step' })}>
        {t('level.step')}
      </Button>
    </div>
  )
}
