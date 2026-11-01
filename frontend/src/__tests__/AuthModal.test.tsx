import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthModal } from '../components/auth/AuthModal'
import { ApiError } from '../services/apiClient'
import { AuthError } from '../services/authErrors'
import type { AuthMode } from '../types/auth'

const authMocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  register: vi.fn(),
}))

vi.mock('../services/authService', () => authMocks)

function renderModal(mode: AuthMode) {
  const onClose = vi.fn()
  const onModeChange = vi.fn()

  render(
    <AuthModal
      isOpen
      mode={mode}
      onClose={onClose}
      onModeChange={onModeChange}
    />,
  )

  return {
    dialog: screen.getByRole('dialog'),
    onClose,
    onModeChange,
  }
}

beforeEach(() => {
  authMocks.signIn.mockReset()
  authMocks.register.mockReset()
})

describe('AuthModal', () => {
  it('validates every register field before calling the API', async () => {
    const user = userEvent.setup()
    const { dialog, onClose } = renderModal('register')

    await user.click(
      within(dialog).getByRole('button', { name: 'Create account' }),
    )

    expect(
      within(dialog).getByText(/Use 3–20 characters/),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(/Use 8–72 characters/),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText('Select your faculty.'),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText('Accept the privacy notice to continue.'),
    ).toBeInTheDocument()
    expect(authMocks.register).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('submits a valid registration and closes the modal', async () => {
    const user = userEvent.setup()
    const { dialog, onClose } = renderModal('register')
    authMocks.register.mockResolvedValue(undefined)

    await user.type(within(dialog).getByLabelText('Username'), 'juan')
    await user.type(
      within(dialog).getByLabelText('Password'),
      'Secret123!',
    )
    await user.selectOptions(within(dialog).getByLabelText('Faculty'), 'BSIT')
    await user.click(
      within(dialog).getByRole('checkbox', {
        name: /I agree to the privacy notice/i,
      }),
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Create account' }),
    )

    await waitFor(() => {
      expect(authMocks.register).toHaveBeenCalledWith({
        username: 'juan',
        password: 'Secret123!',
        faculty: 'BSIT',
        tosAccepted: true,
      })
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows a server username error on registration', async () => {
    const user = userEvent.setup()
    const { dialog } = renderModal('register')
    authMocks.register.mockRejectedValue(
      new ApiError('USERNAME_TAKEN', 'That username is already taken.', 409),
    )

    await user.type(within(dialog).getByLabelText('Username'), 'juan')
    await user.type(
      within(dialog).getByLabelText('Password'),
      'Secret123!',
    )
    await user.selectOptions(within(dialog).getByLabelText('Faculty'), 'BSIT')
    await user.click(
      within(dialog).getByRole('checkbox', {
        name: /I agree to the privacy notice/i,
      }),
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Create account' }),
    )

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'That username is already taken.',
    )
  })

  it('shows a generic invalid-credentials alert on login', async () => {
    const user = userEvent.setup()
    const { dialog, onClose } = renderModal('login')
    authMocks.signIn.mockRejectedValue(
      new AuthError('INVALID_CREDENTIALS', 'Invalid username or password.'),
    )

    await user.type(within(dialog).getByLabelText('Username'), 'juan')
    await user.type(
      within(dialog).getByLabelText('Password'),
      'wrong-password',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Sign in' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Invalid username or password.',
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('switches between login and registration', async () => {
    const user = userEvent.setup()
    const { dialog, onModeChange } = renderModal('login')

    await user.click(
      within(dialog).getByRole('button', { name: 'Create an account' }),
    )

    expect(onModeChange).toHaveBeenCalledWith('register')
  })
})
