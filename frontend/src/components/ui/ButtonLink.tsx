import clsx from 'clsx'
import type { ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'utility'

const BASE_CLASSES =
  'inline-flex min-h-11 items-center justify-center gap-xs transition-colors duration-150 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'rounded-full bg-primary px-lg py-sm text-button text-on-primary hover:bg-primary-active',
  secondary:
    'rounded-full bg-surface px-lg py-sm text-button text-ink shadow-soft hover:bg-canvas-soft',
  utility:
    'rounded-md border border-hairline bg-surface px-md py-xxs text-body-sm text-ink hover:bg-canvas-soft',
}

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
    <a
      href={href}
      onClick={onClick}
      className={clsx(BASE_CLASSES, VARIANT_CLASSES[variant], className)}
    >
      {children}
    </a>
  )
}
