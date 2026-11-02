import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { clearResponseCache } from '../services/responseCache'

vi.mock('lottie-react', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  return {
    Lottie: ({
      src,
      className,
      autoplay,
      loop,
    }: {
      src: string
      className?: string
      autoplay?: boolean
      loop?: boolean
    }) =>
      React.createElement('div', {
        'data-testid': 'lottie',
        'data-src': src,
        'data-autoplay': String(autoplay),
        'data-loop': String(loop),
        className,
      }),
  }
})

if (typeof HTMLDialogElement !== 'undefined') {
  if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
    HTMLDialogElement.prototype.showModal = function showModal(
      this: HTMLDialogElement,
    ) {
      this.open = true
    }
  }

  if (typeof HTMLDialogElement.prototype.close !== 'function') {
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      if (!this.open) {
        return
      }

      this.open = false
      this.dispatchEvent(new Event('close'))
    }
  }
}

afterEach(() => {
  cleanup()
  clearResponseCache()
})
