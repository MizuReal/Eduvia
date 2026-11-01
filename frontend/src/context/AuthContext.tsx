import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  getProfile,
  getSession,
  onAuthStateChange,
  signOut as signOutRequest,
} from '../services/authService'
import type { AuthProfile } from '../types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

type AuthContextValue = {
  status: AuthStatus
  session: Session | null
  profile: AuthProfile | null
  profileError: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void getSession()
      .then((nextSession) => {
        if (!active) {
          return
        }

        setSession(nextSession)
        setStatus(nextSession ? 'authenticated' : 'anonymous')
      })
      .catch(() => {
        if (active) {
          setStatus('anonymous')
        }
      })

    const unsubscribe = onAuthStateChange((nextSession) => {
      setSession(nextSession)
      setStatus(nextSession ? 'authenticated' : 'anonymous')

      if (!nextSession) {
        setProfile(null)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setProfile(null)
      setProfileError(null)
      return
    }

    let cancelled = false
    setProfileError(null)

    void getProfile(session.access_token)
      .then((nextProfile) => {
        if (!cancelled) {
          setProfile(nextProfile)
          setProfileError(null)
        }
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        setProfile(null)
        setProfileError('We could not load your account details.')
      })

    return () => {
      cancelled = true
    }
  }, [session])

  const signOut = useCallback(async () => {
    await signOutRequest()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, profile, profileError, signOut }),
    [status, session, profile, profileError, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return value
}
