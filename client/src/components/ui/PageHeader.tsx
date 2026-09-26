import styles from './PageHeader.module.css'

interface PageHeaderProps {
  readonly title: string
  readonly lede?: string
}

export function PageHeader({ title, lede }: PageHeaderProps) {
  return (
    <header className={styles['header']}>
      <h1 className={styles['title']}>{title}</h1>
      {lede ? <p className={styles['lede']}>{lede}</p> : null}
    </header>
  )
}
