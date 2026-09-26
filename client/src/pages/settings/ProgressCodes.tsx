import { useId, useState } from 'react'
import { Button } from '@/components/ui'
import { useProgressCodes } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import type { ProgressCodeRead, ProgressSummary } from '@/models'
import styles from './ProgressCodes.module.css'

type CopyState = 'idle' | 'copied' | 'manual'

const summaryText = (key: MessageKey, summary: ProgressSummary) =>
  t(key, { stars: summary.stars, levels: summary.levels, concepts: summary.concepts })

/**
 * Move progress between devices (PRD F8): show this device's code to copy, and load a pasted
 * code after a preview that compares it with the progress it would replace.
 */
export function ProgressCodes() {
  const codes = useProgressCodes()
  const id = useId()
  const [myCode, setMyCode] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [pasted, setPasted] = useState('')
  const [read, setRead] = useState<ProgressCodeRead | null>(null)
  const [loaded, setLoaded] = useState<ProgressSummary | null>(null)

  const showCode = async () => {
    setMyCode(await codes.createCode())
    setCopyState('idle')
  }
  const copy = async () => {
    if (myCode) setCopyState((await codes.copy(myCode)) ? 'copied' : 'manual')
  }
  const check = async () => {
    setLoaded(null)
    setRead(await codes.readCode(pasted))
  }
  const replace = () => {
    if (!read?.ok) return
    codes.applyImport(read.progress)
    setLoaded(read.incoming)
    setRead(null)
    setPasted('')
    // The old code no longer matches this device's progress.
    setMyCode(null)
  }

  return (
    <section className={styles['transfer']} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles['sectionTitle']}>
        {t('settings.codes.title')}
      </h2>
      <p className={styles['hint']}>{t('settings.codes.lede')}</p>

      <h3 className={styles['subTitle']}>{t('settings.codes.export.title')}</h3>
      {myCode ? (
        <>
          <label className={styles['label']} htmlFor={`${id}-mine`}>
            {t('settings.codes.export.label')}
          </label>
          <textarea
            id={`${id}-mine`}
            className={styles['code']}
            value={myCode}
            readOnly
            rows={4}
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className={styles['actions']}>
            <Button variant="primary" onClick={() => void copy()}>
              {t('settings.codes.export.copy')}
            </Button>
            <span className={styles['hint']} role="status">
              {copyState === 'copied'
                ? t('settings.codes.export.copied')
                : copyState === 'manual'
                  ? t('settings.codes.export.manual')
                  : ''}
            </span>
          </div>
        </>
      ) : (
        <Button onClick={() => void showCode()}>{t('settings.codes.export.show')}</Button>
      )}

      <h3 className={styles['subTitle']}>{t('settings.codes.import.title')}</h3>
      <label className={styles['label']} htmlFor={`${id}-paste`}>
        {t('settings.codes.import.label')}
      </label>
      <textarea
        id={`${id}-paste`}
        className={styles['code']}
        value={pasted}
        rows={4}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        onChange={(event) => {
          setPasted(event.target.value)
          setRead(null)
        }}
      />
      <div className={styles['actions']}>
        <Button onClick={() => void check()} disabled={pasted.trim() === ''}>
          {t('settings.codes.import.check')}
        </Button>
      </div>

      {read?.ok ? (
        <div className={styles['preview']}>
          <p>{summaryText('settings.codes.import.incoming', read.incoming)}</p>
          <p>{summaryText('settings.codes.import.current', read.current)}</p>
          <p className={styles['hint']}>{t('settings.codes.import.warning')}</p>
          <div className={styles['actions']}>
            <Button variant="primary" onClick={replace}>
              {t('settings.codes.import.replace')}
            </Button>
            <Button onClick={() => setRead(null)}>{t('settings.codes.import.cancel')}</Button>
          </div>
        </div>
      ) : null}
      {read && !read.ok ? (
        <p className={styles['problem']} role="alert">
          {t(`settings.codes.problem.${read.problem}` as MessageKey)}
        </p>
      ) : null}
      {loaded ? (
        <p className={styles['hint']} role="status">
          {summaryText('settings.codes.import.done', loaded)}
        </p>
      ) : null}
    </section>
  )
}
