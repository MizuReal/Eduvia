import clsx from 'clsx'
import { Lottie } from 'lottie-react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

type LottieVisualProps = {
  src: string
  className?: string
  label?: string
}

export function LottieVisual({ src, className, label }: LottieVisualProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <div
      className={clsx('pointer-events-none select-none', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Lottie
        src={src}
        autoplay={!prefersReducedMotion}
        loop={!prefersReducedMotion}
        className="size-full"
        aria-hidden="true"
      />
    </div>
  )
}
