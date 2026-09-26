import { useId } from 'react'
import styles from './Switch.module.css'

interface SwitchProps {
  readonly label: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  readonly hint?: string
}

/** An on/off setting that applies immediately (role="switch"). */
export function Switch({ label, checked, onChange, hint }: SwitchProps) {
  const id = useId()
  const labelId = `${id}-label`
  const hintId = `${id}-hint`

  return (
    <div className={styles['row']}>
      <div className={styles['text']}>
        <span id={labelId} className={styles['label']}>
          {label}
        </span>
        {hint ? (
          <span id={hintId} className={styles['hint']}>
            {hint}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        className={styles['switch']}
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        onClick={() => onChange(!checked)}
      >
        <span className={styles['thumb']} aria-hidden="true" />
      </button>
    </div>
  )
}
