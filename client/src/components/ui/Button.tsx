import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'quiet'
export type ButtonSize = 'regular' | 'small'

function classNames(variant: ButtonVariant, size: ButtonSize): string {
  return [styles['button'], styles[variant], size === 'small' ? styles['small'] : '']
    .filter(Boolean)
    .join(' ')
}

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
}

export function Button({
  variant = 'quiet',
  size = 'regular',
  type = 'button',
  ...rest
}: ButtonProps) {
  return <button type={type} className={classNames(variant, size)} {...rest} />
}

interface ButtonLinkProps {
  readonly to: string
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly children: ReactNode
}

/** An in-app link styled as a button (navigation, not an action). */
export function ButtonLink({ to, variant = 'quiet', size = 'regular', children }: ButtonLinkProps) {
  return (
    <Link to={to} className={classNames(variant, size)}>
      {children}
    </Link>
  )
}
