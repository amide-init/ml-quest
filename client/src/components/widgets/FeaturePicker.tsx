import { t, type MessageKey } from '@/i18n'
import type { Command, PolynomialFeature } from '@/models'
import styles from './FeaturePicker.module.css'

interface FeaturePickerProps {
  readonly available: readonly PolynomialFeature[]
  readonly selected: readonly PolynomialFeature[]
  readonly disabled: boolean
  /** Widgets never call services: they emit commands (ARCHITECTURE §3). */
  readonly onCommand: (command: Command) => void
}

/** Toggle which features a model sees (W2-L3), as native checkboxes. */
export function FeaturePicker({ available, selected, disabled, onCommand }: FeaturePickerProps) {
  return (
    <fieldset className={styles['fieldset']} disabled={disabled}>
      <legend className={styles['legend']}>{t('level.features.legend')}</legend>
      <div className={styles['options']}>
        {available.map((feature) => (
          <label key={feature} className={styles['option']}>
            <input
              className={styles['input']}
              type="checkbox"
              checked={selected.includes(feature)}
              onChange={() => onCommand({ type: 'toggle-feature', feature })}
            />
            <span className={styles['label']}>{t(`level.features.${feature}` as MessageKey)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
