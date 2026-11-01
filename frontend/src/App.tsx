import { SiteFooter } from './components/layout/SiteFooter'
import { SiteHeader } from './components/layout/SiteHeader'
import HomePage from './pages/HomePage'

export function App() {
  return (
    <div id="top" className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-md focus:top-md focus:z-50 focus:rounded-md focus:bg-surface focus:px-md focus:py-xs focus:text-body-sm focus:text-ink focus:shadow-soft"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <HomePage />
      </main>
      <SiteFooter />
    </div>
  )
}
