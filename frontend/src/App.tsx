import { useState } from 'react'
import { AuthModal } from './components/auth/AuthModal'
import { SiteFooter } from './components/layout/SiteFooter'
import { SiteHeader } from './components/layout/SiteHeader'
import { AuthProvider } from './context/AuthContext'
import HomePage from './pages/HomePage'
import type { AuthMode } from './types/auth'

export function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode)
    setIsAuthOpen(true)
  }

  const closeAuth = () => setIsAuthOpen(false)

  return (
    <AuthProvider>
      <div id="top" className="flex min-h-svh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-md focus:top-md focus:z-50 focus:rounded-md focus:bg-surface focus:px-md focus:py-xs focus:text-body-sm focus:text-ink focus:shadow-soft"
        >
          Skip to content
        </a>
        <SiteHeader onOpenAuth={openAuth} />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          <HomePage />
        </main>
        <SiteFooter />
        <AuthModal
          isOpen={isAuthOpen}
          mode={authMode}
          onClose={closeAuth}
          onModeChange={setAuthMode}
        />
      </div>
    </AuthProvider>
  )
}
