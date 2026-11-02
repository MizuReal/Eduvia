import { Container } from './Container'

const FOOTER_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#roles', label: 'For every role' },
  { href: '#top', label: 'Back to top' },
] as const

const FOOTER_LINK_CLASSES =
  'inline-flex min-h-11 items-center text-caption text-ink-secondary transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-hairline bg-canvas-soft print:hidden">
      <Container className="py-xxl">
        <div className="flex flex-col gap-lg sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-xs">
              <img
                src="/assets/icon.png"
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-md object-contain"
              />
              <p className="text-title text-ink">Eduvia</p>
            </div>
            <p className="mt-xxs text-body-sm text-ink-muted">
              A calm place to teach and learn.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-md">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={FOOTER_LINK_CLASSES}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <p className="mt-lg border-t border-hairline pt-md text-caption text-ink-muted">
          © {currentYear} Eduvia
        </p>
      </Container>
    </footer>
  )
}
