import { useId } from 'react'
import { Button } from '@/components/ui'
import type { Command, HyperparameterName } from '@/models'
import styles from './HyperparameterControls.module.css'

interface HyperparameterControlsProps {
  readonly name: HyperparameterName
  readonly label: string
  readonly hint: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly step: number
  /** Optional button next to the slider, e.g. "Take a step" (W1-L3) or "Train" (W1-L4). */
  readonly actionLabel?: string
  readonly action?: Command
  readonly disabled: boolean
  /** Widgets never call services: they emit commands (ARCHITECTURE §3). */
  readonly onCommand: (command: Command) => void
}

/** A hyperparameter slider plus the action that uses it. */
export function HyperparameterControls({
  name,
  label,
  hint,
  value,
  min,
  max,
  step,
  actionLabel,
  action,
  disabled,
  onCommand,
}: HyperparameterControlsProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const decimals = Math.max(0, -Math.floor(Math.log10(step)))

  return (
    <div className={styles['controls']}>
      <div className={styles['field']}>
        <div className={styles['labelRow']}>
          <label htmlFor={id} className={styles['label']}>
            {label}
          </label>
          <output htmlFor={id} className={styles['value']}>
            {value.toFixed(decimals)}
          </output>
        </div>
        <input
          id={id}
          className={styles['range']}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-describedby={hintId}
          onChange={(event) =>
            onCommand({ type: 'set-hyperparameter', name, value: Number(event.target.value) })
          }
        />
        <p id={hintId} className={styles['hint']}>
          {hint}
        </p>
      </div>
      {action && actionLabel ? (
        <Button variant="primary" disabled={disabled} onClick={() => onCommand(action)}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
