import type { ReactNode } from 'react'
import { buttonClasses } from './buttonStyles'
import type { ButtonVariant } from './buttonStyles'

type ButtonLinkProps = {
  href: string
  variant: ButtonVariant
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function ButtonLink({
  href,
  variant,
  children,
  className,
  onClick,
}: ButtonLinkProps) {
  return (
    <a href={href} onClick={onClick} className={buttonClasses(variant, className)}>
      {children}
    </a>
  )
}
