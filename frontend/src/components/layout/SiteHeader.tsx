import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ButtonLink } from '../ui/ButtonLink'
import { Container } from './Container'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#roles', label: 'For every role' },
] as const

const NAV_LINK_CLASSES =
  'inline-flex min-h-11 items-center rounded-sm px-xs text-body-sm text-ink-secondary transition-colors hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const MENU_BUTTON_CLASSES =
  'inline-flex size-11 items-center justify-center rounded-md border border-hairline bg-surface text-ink transition-colors hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden'

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

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

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas">
      <Container className="flex items-center justify-between gap-md py-sm">
        <a
          href="#top"
          className="rounded-sm text-title text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Eduvia
        </a>

        <div className="hidden items-center gap-lg md:flex">
          <nav aria-label="Primary" className="flex items-center gap-xxs">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={NAV_LINK_CLASSES}>
                {link.label}
              </a>
            ))}
          </nav>
          <ButtonLink href="#features" variant="utility">
            Explore features
          </ButtonLink>
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
        <div id="mobile-navigation" className="border-t border-hairline md:hidden">
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
              <ButtonLink
                href="#features"
                variant="utility"
                className="mt-xs w-full"
                onClick={closeMenu}
              >
                Explore features
              </ButtonLink>
            </nav>
          </Container>
        </div>
      )}
    </header>
  )
}
