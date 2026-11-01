import clsx from 'clsx'
import type { ReactNode } from 'react'

type ContainerProps = {
  children: ReactNode
  className?: string
}

export function Container({ children, className }: ContainerProps) {
  return (
    <div className={clsx('mx-auto w-full max-w-6xl px-md sm:px-lg', className)}>
      {children}
    </div>
  )
}
