import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthModal } from '../components/auth/AuthModal'
import { ToastProvider } from '../components/ui/ToastProvider'
import { ApiError } from '../services/apiClient'
import { AuthError } from '../services/authErrors'
import type { AuthMode } from '../types/auth'
import type { UserEvent } from '@testing-library/user-event'

const authMocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  register: vi.fn(),
}))

vi.mock('../services/authService', () => authMocks)

function renderModal(mode: AuthMode) {
  const onClose = vi.fn()
  const onModeChange = vi.fn()

  render(
    <ToastProvider>
      <AuthModal
        isOpen
        mode={mode}
        onClose={onClose}
        onModeChange={onModeChange}
      />
    </ToastProvider>,
  )

  return {
    dialog: screen.getByRole('dialog'),
    onClose,
    onModeChange,
  }
}

async function fillStudentRegistration(
  user: UserEvent,
  dialog: HTMLElement,
) {
  await user.click(within(dialog).getByRole('radio', { name: /^Student/i }))
  await user.type(within(dialog).getByLabelText('First name'), 'Juan')
  await user.type(within(dialog).getByLabelText('Middle name'), 'Dela')
  await user.type(within(dialog).getByLabelText('Last name'), 'Cruz')
  await user.type(
    within(dialog).getByLabelText('Username'),
    'tupt-25-1234',
  )
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
}

beforeEach(() => {
  authMocks.signIn.mockReset()
  authMocks.register.mockReset()
})

describe('AuthModal', () => {
  it('validates every register field before calling the API', async () => {
    const user = userEvent.setup()
    const { dialog, onClose } = renderModal('register')

    expect(screen.getByTestId('lottie')).toHaveAttribute(
      'data-src',
      '/animations/graduation_cap.json',
    )

    await user.click(
      within(dialog).getByRole('button', { name: 'Create account' }),
    )

    expect(
      within(dialog).getByText('Choose Student or Teacher.'),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText('Enter your first name.'),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText('Enter your middle name.'),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText('Enter your last name.'),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText(/Use the format TUPT-XX-XXXX/),
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

  it('submits a valid student registration and closes the modal', async () => {
    const user = userEvent.setup()
    const { dialog, onClose } = renderModal('register')
    authMocks.register.mockResolvedValue(undefined)

    await fillStudentRegistration(user, dialog)
    await user.click(
      within(dialog).getByRole('button', { name: 'Create account' }),
    )

    await waitFor(() => {
      expect(authMocks.register).toHaveBeenCalledWith({
        role: 'student',
        firstName: 'Juan',
        middleName: 'Dela',
        lastName: 'Cruz',
        username: 'TUPT-25-1234',
        password: 'Secret123!',
        faculty: 'BSIT',
        tosAccepted: true,
      })
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent(
      'You are now registered. Welcome to Eduvia!',
    )
  })

  it('reveals the teacher code and submits an instructor registration', async () => {
    const user = userEvent.setup()
    const { dialog, onClose } = renderModal('register')
    authMocks.register.mockResolvedValue(undefined)

    await user.click(within(dialog).getByRole('radio', { name: /^Teacher/i }))
    await user.type(within(dialog).getByLabelText('First name'), 'Juana')
    await user.type(within(dialog).getByLabelText('Middle name'), 'Dela')
    await user.type(within(dialog).getByLabelText('Last name'), 'Cruz')
    await user.type(
      within(dialog).getByLabelText('Username'),
      'TUPT-24-5678',
    )
    await user.type(
      within(dialog).getByLabelText('Password'),
      'Secret123!',
    )
    await user.type(
      within(dialog).getByLabelText('Teacher access code'),
      'teacher-code',
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
        role: 'instructor',
        firstName: 'Juana',
        middleName: 'Dela',
        lastName: 'Cruz',
        username: 'TUPT-24-5678',
        password: 'Secret123!',
        faculty: 'BSIT',
        teacherAccessCode: 'teacher-code',
        tosAccepted: true,
      })
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent(
      'You are now registered. Welcome to Eduvia!',
    )
  })

  it('shows a welcome back toast after login', async () => {
    const user = userEvent.setup()
    const { dialog, onClose } = renderModal('login')
    authMocks.signIn.mockResolvedValue(undefined)

    await user.type(within(dialog).getByLabelText('Username'), 'juan')
    await user.type(
      within(dialog).getByLabelText('Password'),
      'Secret123!',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(authMocks.signIn).toHaveBeenCalledWith('juan', 'Secret123!')
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Welcome back! You are signed in.',
    )
  })

  it('hides the teacher code when switching back to student', async () => {
    const user = userEvent.setup()
    const { dialog } = renderModal('register')

    await user.click(within(dialog).getByRole('radio', { name: /^Teacher/i }))
    expect(
      within(dialog).getByLabelText('Teacher access code'),
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('radio', { name: /^Student/i }))
    expect(
      within(dialog).queryByLabelText('Teacher access code'),
    ).not.toBeInTheDocument()
  })

  it('shows a server username error on registration', async () => {
    const user = userEvent.setup()
    const { dialog } = renderModal('register')
    authMocks.register.mockRejectedValue(
      new ApiError('USERNAME_TAKEN', 'That username is already taken.', 409),
    )

    await fillStudentRegistration(user, dialog)
    await user.click(
      within(dialog).getByRole('button', { name: 'Create account' }),
    )

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'That username is already taken.',
    )
  })

  it('shows an invalid teacher code on the access-code field', async () => {
    const user = userEvent.setup()
    const { dialog } = renderModal('register')
    authMocks.register.mockRejectedValue(
      new ApiError(
        'INVALID_TEACHER_CODE',
        'The teacher access code is invalid.',
        403,
      ),
    )

    await user.click(within(dialog).getByRole('radio', { name: /^Teacher/i }))
    await user.type(within(dialog).getByLabelText('First name'), 'Juana')
    await user.type(within(dialog).getByLabelText('Middle name'), 'Dela')
    await user.type(within(dialog).getByLabelText('Last name'), 'Cruz')
    await user.type(
      within(dialog).getByLabelText('Username'),
      'TUPT-24-5678',
    )
    await user.type(
      within(dialog).getByLabelText('Password'),
      'Secret123!',
    )
    await user.type(
      within(dialog).getByLabelText('Teacher access code'),
      'wrong-code',
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
      'The teacher access code is invalid.',
    )
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    const { dialog } = renderModal('login')
    const password = within(dialog).getByLabelText('Password')

    expect(password).toHaveAttribute('type', 'password')

    await user.type(password, 'Secret123!')
    await user.click(
      within(dialog).getByRole('button', { name: 'Show password' }),
    )

    expect(password).toHaveAttribute('type', 'text')
    expect(
      within(dialog).getByRole('button', { name: 'Hide password' }),
    ).toBeInTheDocument()

    await user.click(
      within(dialog).getByRole('button', { name: 'Hide password' }),
    )

    expect(password).toHaveAttribute('type', 'password')
  })

  it('shows a generic invalid-credentials alert on login', async () => {
    const user = userEvent.setup()
    const { dialog, onClose } = renderModal('login')
    authMocks.signIn.mockRejectedValue(
      new AuthError('INVALID_CREDENTIALS', 'Invalid username or password.'),
    )

    expect(screen.getByTestId('lottie')).toHaveAttribute(
      'data-src',
      '/animations/graduation_cap.json',
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
