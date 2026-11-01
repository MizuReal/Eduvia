import { BookOpen, CircleAlert, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import type { AuthMode } from '../../types/auth'
import { Button } from '../ui/Button'
import { ButtonLink } from '../ui/ButtonLink'

type TeacherAccessGateProps = {
  onOpenAuth: (mode: AuthMode) => void
  children: ReactNode
}

function GateSkeleton() {
  return (
    <div
      className="mt-xl grid gap-lg lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]"
      aria-busy="true"
    >
      <div className="h-96 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <div className="h-96 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <span className="sr-only">Loading teacher workspace</span>
    </div>
  )
}

function SignInGate({
  onOpenAuth,
}: Pick<TeacherAccessGateProps, 'onOpenAuth'>) {
  return (
    <div className="mt-xl max-w-xl rounded-lg border border-hairline bg-surface p-lg shadow-soft">
      <span className="flex size-12 items-center justify-center rounded-lg bg-accent-purple">
        <BookOpen className="size-6 text-ink" aria-hidden="true" />
      </span>
      <h2 className="mt-md text-heading-3">Sign in to manage your subjects</h2>
      <p className="mt-xxs text-body-sm text-ink-muted">
        Use your teacher account to create subjects and keep them organized.
      </p>
      <Button
        variant="primary"
        className="mt-md"
        onClick={() => onOpenAuth('login')}
      >
        Sign in
      </Button>
    </div>
  )
}

function AccessDenied() {
  return (
    <div className="mt-xl max-w-xl rounded-lg border border-hairline bg-surface p-lg shadow-soft">
      <span className="flex size-12 items-center justify-center rounded-lg bg-canvas-soft">
        <ShieldAlert className="size-6 text-ink-secondary" aria-hidden="true" />
      </span>
      <h2 className="mt-md text-heading-3">Teacher access required</h2>
      <p className="mt-xxs text-body-sm text-ink-muted">
        This workspace is available to instructor accounts.
      </p>
      <ButtonLink href="/" variant="secondary" className="mt-md">
        Back to home
      </ButtonLink>
    </div>
  )
}

function ProfileError() {
  return (
    <div
      role="alert"
      className="mt-xl flex max-w-xl items-start gap-xs rounded-lg border border-accent-orange-deep/30 bg-surface p-lg"
    >
      <CircleAlert
        className="mt-xxs size-5 shrink-0 text-accent-orange-deep"
        aria-hidden="true"
      />
      <div>
        <h2 className="text-heading-3">We could not load your account</h2>
        <p className="mt-xxs text-body-sm text-ink-muted">
          Refresh the page or sign in again.
        </p>
      </div>
    </div>
  )
}

export function TeacherAccessGate({
  onOpenAuth,
  children,
}: TeacherAccessGateProps) {
  const { status, profile, profileError } = useAuth()

  if (
    status === 'loading' ||
    (status === 'authenticated' && !profile && !profileError)
  ) {
    return <GateSkeleton />
  }

  if (status === 'anonymous') {
    return <SignInGate onOpenAuth={onOpenAuth} />
  }

  if (profileError) {
    return <ProfileError />
  }

  if (!profile || profile.role !== 'instructor') {
    return <AccessDenied />
  }

  return <>{children}</>
}
