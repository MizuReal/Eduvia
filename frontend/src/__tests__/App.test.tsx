import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getProfile: vi.fn(),
  onAuthStateChange: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  register: vi.fn(),
  usernameToAuthEmail: vi.fn(),
}))

vi.mock('../services/authService', () => authMocks)

beforeEach(() => {
  Object.values(authMocks).forEach((mock) => mock.mockReset())
  authMocks.getSession.mockResolvedValue(null)
  authMocks.onAuthStateChange.mockReturnValue(() => undefined)
})

describe('App', () => {
  it('renders the homepage content', async () => {
    render(<App />)

    await screen.findByRole('button', { name: 'Sign in' })

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /everything your course needs/i,
      }),
    ).toBeInTheDocument()

    const features = screen.getByRole('region', {
      name: /everything a course needs/i,
    })
    expect(within(features).getAllByRole('heading', { level: 3 })).toHaveLength(6)

    const roles = screen.getByRole('region', {
      name: /one workspace, three points of view/i,
    })
    expect(within(roles).getAllByRole('heading', { level: 3 })).toHaveLength(3)

    expect(screen.getByTestId('lottie')).toHaveAttribute(
      'data-src',
      '/animations/teacher_owl.json',
    )
    expect(
      document.querySelectorAll('img[src="/assets/icon.png"]'),
    ).toHaveLength(2)
  })

  it('opens and closes the mobile menu with the keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('button', { name: 'Sign in' })

    const toggle = screen.getByRole('button', { name: /open menu/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAccessibleName(/close menu/i)

    const mobileNavigation = screen.getByRole('navigation', { name: /mobile/i })
    expect(
      within(mobileNavigation).getByRole('link', { name: 'Features' }),
    ).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(
      screen.queryByRole('navigation', { name: /mobile/i }),
    ).not.toBeInTheDocument()
    expect(toggle).toHaveFocus()
  })

  it('opens the register modal from the header', async () => {
    const user = userEvent.setup()
    render(<App />)

    const createAccount = await screen.findByRole('button', {
      name: 'Create account',
    })
    await user.click(createAccount)

    const dialog = await screen.findByRole('dialog', {
      name: /create your eduvia account/i,
    })

    expect(within(dialog).getByLabelText('Username')).toBeInTheDocument()
    expect(within(dialog).getByRole('combobox', { name: 'Faculty' })).toBeInTheDocument()
  })
})
