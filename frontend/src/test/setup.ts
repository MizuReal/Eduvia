import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { clearResponseCache } from '../services/responseCache'

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
