import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/ui/ToastProvider'
import { useToast } from '../components/ui/toastContext'

function ToastTrigger() {
  const { showToast } = useToast()

  return (
    <>
      <button type="button" onClick={() => showToast('Saved successfully.')}>
        Show toast
      </button>
      <button type="button" onClick={() => showToast('Second message.')}>
        Show second toast
      </button>
    </>
  )
}

function renderToast() {
  return render(
    <ToastProvider>
      <ToastTrigger />
    </ToastProvider>,
  )
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a toast message', () => {
    renderToast()

    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Saved successfully.',
    )
  })

  it('replaces the current toast with a new message', () => {
    renderToast()

    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Show second toast' }),
    )

    expect(screen.getByRole('status')).toHaveTextContent('Second message.')
    expect(screen.queryByText('Saved successfully.')).not.toBeInTheDocument()
  })

  it('dismisses the toast manually', () => {
    renderToast()
    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }))

    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss notification' }),
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('auto-dismisses after five seconds', () => {
    renderToast()
    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }))

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
