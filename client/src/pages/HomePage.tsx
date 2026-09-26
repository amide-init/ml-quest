import { ButtonLink } from '@/components/ui'
import { ValleyLandscape } from '@/components/viz'
import { usePrefersReducedMotion, useDocumentTitle } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import styles from './HomePage.module.css'

const LEVEL_LOOP: readonly { title: MessageKey; body: MessageKey }[] = [
  { title: 'home.loop.mission.title', body: 'home.loop.mission.body' },
  { title: 'home.loop.train.title', body: 'home.loop.train.body' },
  { title: 'home.loop.pass.title', body: 'home.loop.pass.body' },
]

export function HomePage() {
  useDocumentTitle(null)
  const reducedMotion = usePrefersReducedMotion()

  return (
    <>
      <section className={styles['hero']}>
        <div className={styles['intro']}>
          <h1 className={styles['title']}>{t('home.title')}</h1>
          <p className={styles['lede']}>{t('home.lede')}</p>
          <div className={styles['actions']}>
            <ButtonLink to="/map" variant="primary">
              {t('home.start')}
            </ButtonLink>
            <ButtonLink to="/codex">{t('home.codex')}</ButtonLink>
          </div>
          <p className={styles['facts']}>{t('home.facts')}</p>
        </div>
        <ValleyLandscape reducedMotion={reducedMotion} />
      </section>

      <section className={styles['loop']} aria-labelledby="level-loop-title">
        <h2 id="level-loop-title" className={styles['loopTitle']}>
          {t('home.loop.title')}
        </h2>
        <ol className={styles['steps']}>
          {LEVEL_LOOP.map((item) => (
            <li key={item.title} className={styles['step']}>
              <h3 className={styles['stepTitle']}>{t(item.title)}</h3>
              <p className={styles['stepBody']}>{t(item.body)}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
