import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../App'

describe('App', () => {
  it('renders the homepage content', () => {
    render(<App />)

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
  })

  it('opens and closes the mobile menu with the keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)

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
})
