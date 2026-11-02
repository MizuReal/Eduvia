import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { messageForAuthError } from '../auth/errors'
import { Button } from '../ui/Button'
import type { AuthMode } from '../../types/auth'
import { useAuth } from '../../context/AuthContext'
import { Container } from './Container'

const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#roles', label: 'For every role' },
] as const

const NAV_LINK_CLASSES =
  'inline-flex min-h-11 items-center rounded-sm px-xs text-body-sm text-ink-secondary transition-colors hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const MENU_BUTTON_CLASSES =
  'inline-flex size-11 items-center justify-center rounded-md border border-hairline bg-surface text-ink transition-colors hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden'

type AuthControlsProps = {
  layout: 'desktop' | 'mobile'
  onOpenAuth: (mode: AuthMode) => void
}

function AuthControls({ layout, onOpenAuth }: AuthControlsProps) {
  const { status, profile, profileError, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const isMobile = layout === 'mobile'
  const containerClasses = isMobile
    ? 'flex flex-col gap-xxs'
    : 'flex items-center gap-md'

  const handleSignOut = async () => {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)
    setSignOutError(null)

    try {
      await signOut()
    } catch (error) {
      setSignOutError(messageForAuthError(error))
    } finally {
      setIsSigningOut(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className={containerClasses} aria-busy="true">
        <span
          className="h-11 w-28 animate-pulse rounded-md bg-canvas-soft motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span className="sr-only">Loading account</span>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <div className={containerClasses}>
        <span className="text-body-sm text-ink-muted" aria-live="polite">
          {profile ? `@${profile.username}` : 'Account'}
        </span>
        <Button
          variant="utility"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={isMobile ? 'w-full' : undefined}
        >
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </Button>
        {(signOutError || profileError) && (
          <p role="alert" className="text-caption text-accent-orange-deep">
            {signOutError ?? profileError}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={containerClasses}>
      <button
        type="button"
        className={`${NAV_LINK_CLASSES}${isMobile ? ' w-full' : ''}`}
        onClick={() => onOpenAuth('login')}
      >
        Sign in
      </button>
      <Button
        variant="utility"
        onClick={() => onOpenAuth('register')}
        className={isMobile ? 'w-full' : undefined}
      >
        Create account
      </Button>
    </div>
  )
}

type SiteHeaderProps = {
  onOpenAuth: (mode: AuthMode) => void
}

export function SiteHeader({ onOpenAuth }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const { profile } = useAuth()

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      setIsMenuOpen(false)
      menuButtonRef.current?.focus()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen])

  const closeMenu = () => setIsMenuOpen(false)
  const openAuthFromMobile = (mode: AuthMode) => {
    closeMenu()
    onOpenAuth(mode)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas">
      <Container className="flex items-center justify-between gap-md py-sm">
        <Link
          to="/"
          className="rounded-sm text-title text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Eduvia
        </Link>

        <div className="hidden items-center gap-lg md:flex">
          <nav aria-label="Primary" className="flex items-center gap-xxs">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={NAV_LINK_CLASSES}>
                {link.label}
              </a>
            ))}
            {profile?.role === 'instructor' && (
              <Link to="/teacher" className={NAV_LINK_CLASSES}>
                Teacher
              </Link>
            )}
            {profile?.role === 'student' && (
              <Link to="/student" className={NAV_LINK_CLASSES}>
                Student
              </Link>
            )}
          </nav>
          <AuthControls layout="desktop" onOpenAuth={onOpenAuth} />
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          className={MENU_BUTTON_CLASSES}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </Container>

      {isMenuOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-hairline md:hidden"
        >
          <Container className="py-sm">
            <nav aria-label="Mobile" className="flex flex-col gap-xxs">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={NAV_LINK_CLASSES}
                  onClick={closeMenu}
                >
                  {link.label}
                </a>
              ))}
              {profile?.role === 'instructor' && (
                <Link
                  to="/teacher"
                  className={NAV_LINK_CLASSES}
                  onClick={closeMenu}
                >
                  Teacher
                </Link>
              )}
              {profile?.role === 'student' && (
                <Link
                  to="/student"
                  className={NAV_LINK_CLASSES}
                  onClick={closeMenu}
                >
                  Student
                </Link>
              )}
              <div className="mt-xs border-t border-hairline pt-sm">
                <AuthControls layout="mobile" onOpenAuth={openAuthFromMobile} />
              </div>
            </nav>
          </Container>
        </div>
      )}
    </header>
  )
}
