import { t, type MessageKey } from '@/i18n'
import type { FeatureRange } from '@/models'
import styles from './FeatureRanges.module.css'

interface FeatureRangesProps {
  readonly features: readonly FeatureRange[]
  /** Show the ranges after scaling instead of the raw ones. */
  readonly scaled: boolean
}

const format = (value: number) => (Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1))

/**
 * Each feature's range on one shared axis (W1-L7). Raw, one feature dwarfs the other;
 * scaled, both cover about the same span around zero.
 */
export function FeatureRanges({ features, scaled }: FeatureRangesProps) {
  const ranges = features.map((feature) =>
    scaled ? [feature.scaledMin, feature.scaledMax] : [feature.min, feature.max],
  )
  const low = Math.min(0, ...ranges.map(([min = 0]) => min))
  const high = Math.max(...ranges.map(([, max = 0]) => max))
  const share = (value: number) => ((value - low) / (high - low || 1)) * 100

  return (
    <section
      className={`${styles['panel']} ${scaled ? styles['scaled'] : ''}`}
      aria-labelledby="feature-ranges"
    >
      <h2 id="feature-ranges" className={styles['heading']}>
        {t('level.scaling.ranges')}: {scaled ? t('level.scaling.scaled') : t('level.scaling.raw')}
      </h2>
      {features.map((feature, index) => {
        const [min = 0, max = 0] = ranges[index] ?? []
        return (
          <div key={feature.label} className={styles['row']}>
            <span className={styles['label']}>
              {t('level.scaling.range', {
                label: t(feature.label as MessageKey),
                min: format(min),
                max: format(max),
              })}
            </span>
            <div className={styles['track']} aria-hidden="true">
              <div
                className={styles['bar']}
                style={{ left: `${share(min)}%`, width: `${share(max) - share(min)}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className={styles['axis']} aria-hidden="true">
        <span>{format(low)}</span>
        <span>{format(high)}</span>
      </div>
    </section>
  )
}
