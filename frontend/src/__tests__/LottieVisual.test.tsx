import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LottieVisual } from '../components/ui/LottieVisual'

function setReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

describe('LottieVisual', () => {
  beforeEach(() => {
    setReducedMotion(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the animation and plays it normally', () => {
    render(
      <LottieVisual
        src="/animations/teacher_owl.json"
        className="h-24 w-48"
      />,
    )

    const animation = screen.getByTestId('lottie')

    expect(animation).toHaveAttribute(
      'data-src',
      '/animations/teacher_owl.json',
    )
    expect(animation).toHaveAttribute('data-autoplay', 'true')
    expect(animation).toHaveAttribute('data-loop', 'true')
  })

  it('does not autoplay or loop when reduced motion is preferred', () => {
    setReducedMotion(true)

    render(<LottieVisual src="/animations/teacher_owl.json" />)

    const animation = screen.getByTestId('lottie')

    expect(animation).toHaveAttribute('data-autoplay', 'false')
    expect(animation).toHaveAttribute('data-loop', 'false')
  })
})
