import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { useDocumentPreferences } from '@/hooks'
import { t, type MessageKey } from '@/i18n'
import styles from './AppLayout.module.css'

const NAV_ITEMS: readonly { to: string; label: MessageKey }[] = [
  { to: '/map', label: 'nav.map' },
  { to: '/codex', label: 'nav.codex' },
  { to: '/settings', label: 'nav.settings' },
]

/** The ML Quest mark: one contour ring with the Learner resting in the valley. */
function Glyph() {
  return (
    <svg className={styles['glyph']} viewBox="0 0 28 28" aria-hidden="true">
      <ellipse className={styles['glyphContour']} cx="14" cy="15" rx="12" ry="8.5" />
      <ellipse className={styles['glyphContour']} cx="15" cy="16" rx="6.5" ry="4.2" />
      <circle className={styles['glyphBall']} cx="16" cy="16.5" r="3" />
    </svg>
  )
}

export function AppLayout() {
  useDocumentPreferences()

  return (
    <>
      <a className={styles['skipLink']} href="#main">
        {t('nav.skip')}
      </a>
      <header className={styles['header']}>
        <div className={styles['bar']}>
          <Link to="/" className={styles['wordmark']} aria-label={t('nav.home')}>
            <Glyph />
            <span>{t('app.name')}</span>
          </Link>
          <nav className={styles['nav']} aria-label={t('nav.label')}>
            <ul>
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={styles['navLink'] ?? ''}>
                    {t(item.label)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className={styles['main']} tabIndex={-1}>
        <Outlet />
      </main>
      <ScrollRestoration />
    </>
  )
}
