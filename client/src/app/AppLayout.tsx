import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { REPOSITORY_URL } from '@/config'
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

/** A five-point star outline (the "Star" link). */
function StarIcon() {
  return (
    <svg className={styles['repoIcon']} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5l1.9 4 4.3.5-3.2 3 .9 4.3L8 11.2l-3.9 2.1.9-4.3-3.2-3 4.3-.5z" />
    </svg>
  )
}

/** Two branches splitting from one trunk (the "Fork" link). */
function ForkIcon() {
  return (
    <svg className={styles['repoIcon']} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="4" cy="3" r="1.6" />
      <circle cx="12" cy="3" r="1.6" />
      <circle cx="8" cy="13" r="1.6" />
      <path d="M4 4.6v1.4a2 2 0 002 2h4a2 2 0 002-2V4.6M8 8v3.4" />
    </svg>
  )
}

const REPOSITORY_LINKS = [
  { href: REPOSITORY_URL, label: 'nav.repo.star', name: 'nav.repo.star.name', Icon: StarIcon },
  {
    href: `${REPOSITORY_URL}/fork`,
    label: 'nav.repo.fork',
    name: 'nav.repo.fork.name',
    Icon: ForkIcon,
  },
] as const

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
          <ul className={styles['repo']} aria-label={t('nav.repo.label')}>
            {REPOSITORY_LINKS.map(({ href, label, name, Icon }) => (
              <li key={label}>
                <a
                  className={styles['repoLink']}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(name)}
                >
                  <Icon />
                  {t(label)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </header>
      <main id="main" className={styles['main']} tabIndex={-1}>
        <Outlet />
      </main>
      <ScrollRestoration />
    </>
  )
}
