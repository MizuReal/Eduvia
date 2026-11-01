import type { ButtonHTMLAttributes } from 'react'
import { buttonClasses } from './buttonStyles'
import type { ButtonVariant } from './buttonStyles'

type ButtonProps = {
  variant: ButtonVariant
} & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  variant,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, className)}
      {...props}
    />
  )
}
