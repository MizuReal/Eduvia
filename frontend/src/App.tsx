import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthModal } from './components/auth/AuthModal'
import { SiteFooter } from './components/layout/SiteFooter'
import { SiteHeader } from './components/layout/SiteHeader'
import { AuthProvider } from './context/AuthContext'
import { CourseOutlinePage } from './pages/CourseOutlinePage'
import HomePage from './pages/HomePage'
import { TeacherPage } from './pages/TeacherPage'
import type { AuthMode } from './types/auth'

function AppShell() {
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode)
    setIsAuthOpen(true)
  }

  const closeAuth = () => setIsAuthOpen(false)

  return (
    <div id="top" className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-md focus:top-md focus:z-50 focus:rounded-md focus:bg-surface focus:px-md focus:py-xs focus:text-body-sm focus:text-ink focus:shadow-soft"
      >
        Skip to content
      </a>
      <SiteHeader onOpenAuth={openAuth} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/teacher"
            element={<TeacherPage onOpenAuth={openAuth} />}
          />
          <Route
            path="/teacher/subjects/:courseId"
            element={<CourseOutlinePage onOpenAuth={openAuth} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <SiteFooter />
      <AuthModal
        isOpen={isAuthOpen}
        mode={authMode}
        onClose={closeAuth}
        onModeChange={setAuthMode}
      />
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}
