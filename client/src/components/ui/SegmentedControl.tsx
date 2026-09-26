import { useId } from 'react'
import styles from './SegmentedControl.module.css'

export interface SegmentedOption<T extends string> {
  readonly value: T
  readonly label: string
}

interface SegmentedControlProps<T extends string> {
  readonly legend: string
  readonly value: T
  readonly options: readonly SegmentedOption<T>[]
  readonly onChange: (value: T) => void
  readonly hint?: string
}

/** A single choice from a few options, built on native radio inputs for keyboard and screen-reader support. */
export function SegmentedControl<T extends string>({
  legend,
  value,
  options,
  onChange,
  hint,
}: SegmentedControlProps<T>) {
  const name = useId()
  const hintId = `${name}-hint`

  return (
    <fieldset className={styles['fieldset']} aria-describedby={hint ? hintId : undefined}>
      <legend className={styles['legend']}>{legend}</legend>
      <div className={styles['options']}>
        {options.map((option) => (
          <label key={option.value} className={styles['option']}>
            <input
              className={styles['input']}
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span className={styles['label']}>{option.label}</span>
          </label>
        ))}
      </div>
      {hint ? (
        <p id={hintId} className={styles['hint']}>
          {hint}
        </p>
      ) : null}
    </fieldset>
  )
}
