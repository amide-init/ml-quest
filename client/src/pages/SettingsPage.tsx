import { PageHeader, SegmentedControl, Switch, type SegmentedOption } from '@/components/ui'
import { useDocumentTitle, useSettings } from '@/hooks'
import { t } from '@/i18n'
import type { MotionPreference, ThemePreference } from '@/models'
import styles from './SettingsPage.module.css'

const THEME_OPTIONS: readonly SegmentedOption<ThemePreference>[] = [
  { value: 'system', label: t('settings.theme.system') },
  { value: 'light', label: t('settings.theme.light') },
  { value: 'dark', label: t('settings.theme.dark') },
]

const MOTION_OPTIONS: readonly SegmentedOption<MotionPreference>[] = [
  { value: 'system', label: t('settings.motion.system') },
  { value: 'reduced', label: t('settings.motion.reduced') },
  { value: 'full', label: t('settings.motion.full') },
]

export function SettingsPage() {
  const title = t('settings.title')
  useDocumentTitle(title)
  const { settings, persistent, updateSettings } = useSettings()

  return (
    <div className={styles['page']}>
      <PageHeader
        title={title}
        lede={persistent ? t('settings.lede') : t('settings.lede.memory')}
      />
      <div className={styles['fields']}>
        <div className={styles['field']}>
          <SegmentedControl
            legend={t('settings.theme.legend')}
            value={settings.theme}
            options={THEME_OPTIONS}
            onChange={(theme) => updateSettings({ theme })}
          />
        </div>
        <div className={styles['field']}>
          <SegmentedControl
            legend={t('settings.motion.legend')}
            value={settings.motion}
            options={MOTION_OPTIONS}
            hint={t('settings.motion.hint')}
            onChange={(motion) => updateSettings({ motion })}
          />
        </div>
        <div className={styles['field']}>
          <Switch
            label={t('settings.sound.label')}
            hint={t('settings.sound.hint')}
            checked={settings.soundEnabled}
            onChange={(soundEnabled) => updateSettings({ soundEnabled })}
          />
        </div>
      </div>
    </div>
  )
}
