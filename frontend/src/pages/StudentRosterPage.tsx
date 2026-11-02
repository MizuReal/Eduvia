import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  Check,
  CircleAlert,
  Copy,
  Link2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Container } from '../components/layout/Container'
import { ConfirmDialog } from '../components/content/ConfirmDialog'
import { FormAlert } from '../components/auth/FormAlert'
import { TeacherAccessGate } from '../components/teacher/TeacherAccessGate'
import { Button } from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'
import {
  ENROLLMENT_MODE_OPTIONS,
  courseTermLabel,
  yearLevelLabel,
} from '../config/course'
import type { EnrollmentMode } from '../config/course'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/apiClient'
import {
  approveEnrollment,
  getCourseEnrollments,
  rejectEnrollment,
  removeEnrollment,
  updateEnrollmentSettings,
} from '../services/enrollmentService'
import type {
  CourseEnrollment,
  CourseEnrollmentWorkspace,
} from '../types/enrollment'
import type { AuthMode } from '../types/auth'

const COPY_FEEDBACK_MS = 2000

type StudentRosterPageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

function RosterSkeleton() {
  return (
    <div className="mt-xl" aria-busy="true">
      <div className="h-72 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <div className="mt-md h-72 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      <span className="sr-only">Loading student roster</span>
    </div>
  )
}

function RosterError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="mt-xl max-w-card rounded-lg border border-accent-orange-deep/30 bg-surface p-lg"
    >
      <CircleAlert
        className="size-5 text-accent-orange-deep"
        aria-hidden="true"
      />
      <p className="mt-xs text-body-sm text-ink">{message}</p>
      <Button variant="utility" onClick={onRetry} className="mt-sm">
        <RefreshCw className="size-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  )
}

function SettingsCard({
  workspace,
  isSaving,
  onSave,
}: {
  workspace: CourseEnrollmentWorkspace
  isSaving: boolean
  onSave: (open: boolean, mode: EnrollmentMode) => void
}) {
  const [open, setOpen] = useState(workspace.course.enrollmentOpen)
  const [mode, setMode] = useState(workspace.course.enrollmentMode)
  const [copied, setCopied] = useState(false)
  const inviteLink = `${window.location.origin}/student/enroll/${workspace.course.id}`

  useEffect(() => {
    setOpen(workspace.course.enrollmentOpen)
    setMode(workspace.course.enrollmentMode)
  }, [workspace.course.enrollmentMode, workspace.course.enrollmentOpen])

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section
      aria-labelledby="enrollment-settings-heading"
      className="rounded-lg border border-hairline bg-surface p-lg shadow-soft"
    >
      <div className="flex items-start justify-between gap-sm">
        <div>
          <h2 id="enrollment-settings-heading" className="text-title text-ink">
            Enrollment settings
          </h2>
          <p className="mt-xxs text-body-sm text-ink-muted">
            Share the invite link with your students. Closed subjects keep their
            current students.
          </p>
        </div>
        <ShieldCheck className="size-5 shrink-0 text-ink-faint" aria-hidden="true" />
      </div>

      <div className="mt-md flex items-center justify-between gap-md rounded-md border border-hairline bg-canvas-soft p-sm">
        <div>
          <p className="text-body-sm font-medium text-ink">Open enrollment</p>
          <p className="text-caption text-ink-muted">
            Allow new students to join through the invite link.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={open}
          aria-label="Open enrollment"
          onClick={() => setOpen((value) => !value)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors before:absolute before:-inset-2 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            open
              ? 'border-primary bg-primary'
              : 'border-hairline bg-surface'
          }`}
        >
          <span
            className={`ml-1 size-5 rounded-full bg-surface shadow-soft transition-transform ${
              open ? 'translate-x-5' : 'translate-x-0'
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      <fieldset className="mt-md">
        <legend className="text-body-sm font-medium text-ink">
          How students join
        </legend>
        <div className="mt-xs grid gap-sm sm:grid-cols-2">
          {ENROLLMENT_MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-md border p-sm transition-colors ${
                mode === option.value
                  ? 'border-primary bg-canvas-soft'
                  : 'border-hairline bg-surface hover:bg-canvas-soft'
              }`}
            >
              <span className="flex items-center gap-xs">
                <input
                  type="radio"
                  name="enrollment-mode"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                  className="size-4 accent-primary"
                />
                <span className="text-body-sm font-medium text-ink">
                  {option.label}
                </span>
              </span>
              <span className="mt-xxs block pl-6 text-caption text-ink-muted">
                {option.description}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-md flex flex-wrap items-center gap-xs">
        <Button
          variant="primary"
          onClick={() => onSave(open, mode)}
          disabled={isSaving}
        >
          {isSaving ? 'Saving…' : 'Save settings'}
        </Button>
        <Button variant="utility" onClick={() => void copyInvite()}>
          {copied ? (
            <Check className="size-4 text-accent-green" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? 'Link copied' : 'Copy invite link'}
        </Button>
      </div>

      <p className="mt-sm flex items-start gap-xxs break-all text-caption text-ink-muted">
        <Link2 className="mt-xxs size-3.5 shrink-0" aria-hidden="true" />
        {inviteLink}
      </p>
    </section>
  )
}

function StudentRow({
  enrollment,
  action,
  resultsHref,
  onApprove,
  onReject,
  onRemove,
}: {
  enrollment: CourseEnrollment
  action: 'approve' | 'reject' | 'remove' | null
  resultsHref: string | null
  onApprove: () => void
  onReject: () => void
  onRemove: () => void
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-sm rounded-md border border-hairline bg-surface px-sm py-xs">
      <div className="min-w-0">
        <p className="truncate text-body-sm font-medium text-ink">
          @{enrollment.student.username}
        </p>
        <p className="text-caption text-ink-muted">
          {enrollment.student.faculty} ·{' '}
          {enrollment.status === 'pending' ? 'Requested' : 'Enrolled'}{' '}
          {new Date(enrollment.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-xxs">
        {enrollment.status === 'pending' ? (
          <>
            <Button
              variant="utility"
              onClick={onApprove}
              disabled={action !== null}
            >
              <Check className="size-4 text-accent-green" aria-hidden="true" />
              Approve
            </Button>
            <Button
              variant="utility"
              onClick={onReject}
              disabled={action !== null}
            >
              <X className="size-4" aria-hidden="true" />
              Reject
            </Button>
          </>
        ) : (
          <>
            {resultsHref && (
              <Link to={resultsHref} className={buttonClasses('utility')}>
                <BarChart3 className="size-4" aria-hidden="true" />
                Results
              </Link>
            )}
            <Button
              variant="utility"
              onClick={onRemove}
              disabled={action !== null}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Remove
            </Button>
          </>
        )}
      </div>
    </li>
  )
}

export function StudentRosterPage({ onOpenAuth }: StudentRosterPageProps) {
  const { courseId } = useParams<{ courseId: string }>()
  const { session } = useAuth()
  const accessToken = session?.access_token
  const [workspace, setWorkspace] =
    useState<CourseEnrollmentWorkspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [busyEnrollment, setBusyEnrollment] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<CourseEnrollment | null>(
    null,
  )
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(async () => {
    if (!courseId || !accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    setNotFound(false)

    try {
      setWorkspace(await getCourseEnrollments(courseId, accessToken))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setNotFound(true)
        return
      }

      setLoadError('We could not load this subject’s students. Try again.')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, courseId])

  useEffect(() => {
    void load()
  }, [load, reloadKey])

  const runAction = async (
    enrollmentId: string,
    action: () => Promise<CourseEnrollmentWorkspace>,
  ) => {
    setBusyEnrollment(enrollmentId)
    setActionError(null)

    try {
      setWorkspace(await action())
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : 'We could not update this student. Try again.',
      )
    } finally {
      setBusyEnrollment(null)
    }
  }

  const saveSettings = async (open: boolean, mode: EnrollmentMode) => {
    if (!courseId || !accessToken) {
      return
    }

    setIsSavingSettings(true)
    setActionError(null)

    try {
      setWorkspace(
        await updateEnrollmentSettings(courseId, { open, mode }, accessToken),
      )
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : 'We could not save enrollment settings. Try again.',
      )
    } finally {
      setIsSavingSettings(false)
    }
  }

  return (
    <section className="py-xl lg:py-section">
      <Container>
        <Link
          to={`/teacher/subjects/${courseId}`}
          className="inline-flex min-h-11 items-center gap-xxs text-body-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to subject outline
        </Link>

        <TeacherAccessGate onOpenAuth={onOpenAuth}>
          {workspace && (
            <div className="mt-md max-w-3xl">
              <span className="inline-flex items-center rounded-full bg-surface px-xs py-xxs text-eyebrow text-primary shadow-soft">
                {workspace.course.code}
              </span>
              <h1 className="mt-md text-heading-2 sm:text-heading-1">
                Students in {workspace.course.name}
              </h1>
              <p className="mt-sm text-body-md text-ink-muted">
                {courseTermLabel(workspace.course.term)} ·{' '}
                {yearLevelLabel(workspace.course.yearLevel)}
              </p>
            </div>
          )}

          {isLoading && <RosterSkeleton />}
          {!isLoading && notFound && (
            <div className="mt-xl max-w-card rounded-lg border border-hairline bg-surface p-lg shadow-soft">
              <CircleAlert
                className="size-5 text-accent-orange-deep"
                aria-hidden="true"
              />
              <h2 className="mt-sm text-heading-3">Subject not found</h2>
              <p className="mt-xxs text-body-sm text-ink-muted">
                This subject does not exist or is not available to your account.
              </p>
            </div>
          )}
          {!isLoading && !notFound && loadError && (
            <RosterError
              message={loadError}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          )}
          {!isLoading && !notFound && !loadError && workspace && (
            <>
              {actionError && (
                <div className="mt-md">
                  <FormAlert message={actionError} />
                </div>
              )}

              <div className="mt-lg grid gap-lg lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <SettingsCard
                  workspace={workspace}
                  isSaving={isSavingSettings}
                  onSave={(open, mode) => void saveSettings(open, mode)}
                />

                <section
                  aria-labelledby="pending-students-heading"
                  className="rounded-lg border border-hairline bg-surface p-lg shadow-soft"
                >
                  <h2
                    id="pending-students-heading"
                    className="text-title text-ink"
                  >
                    Pending requests
                  </h2>
                  {workspace.pending.length === 0 ? (
                    <p className="mt-sm text-body-sm text-ink-muted">
                      No pending requests.
                    </p>
                  ) : (
                    <ul className="mt-sm space-y-xs">
                      {workspace.pending.map((enrollment) => (
                        <StudentRow
                          key={enrollment.id}
                          enrollment={enrollment}
                          action={
                            busyEnrollment === enrollment.id
                              ? 'approve'
                              : null
                          }
                          resultsHref={null}
                          onApprove={() =>
                            void runAction(enrollment.id, () =>
                              approveEnrollment(enrollment.id, accessToken ?? ''),
                            )
                          }
                          onReject={() =>
                            void runAction(enrollment.id, () =>
                              rejectEnrollment(enrollment.id, accessToken ?? ''),
                            )
                          }
                          onRemove={() => setRemoveTarget(enrollment)}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <section
                aria-labelledby="active-students-heading"
                className="mt-lg rounded-lg border border-hairline bg-surface p-lg shadow-soft"
              >
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <div>
                    <h2
                      id="active-students-heading"
                      className="text-title text-ink"
                    >
                      Enrolled students
                    </h2>
                    <p className="mt-xxs text-body-sm text-ink-muted">
                      Students with access to this subject.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-xxs rounded-full border border-hairline bg-canvas-soft px-xs py-xxs text-eyebrow text-ink-muted">
                    <Users className="size-3.5" aria-hidden="true" />
                    {workspace.active.length}
                  </span>
                </div>

                {workspace.active.length === 0 ? (
                  <p className="mt-sm text-body-sm text-ink-muted">
                    No students have joined yet.
                  </p>
                ) : (
                  <ul className="mt-sm space-y-xs">
                    {workspace.active.map((enrollment) => (
                      <StudentRow
                        key={enrollment.id}
                        enrollment={enrollment}
                        action={
                          busyEnrollment === enrollment.id ? 'remove' : null
                        }
                        resultsHref={
                          courseId
                            ? `/teacher/subjects/${courseId}/students/${enrollment.studentId}/results`
                            : null
                        }
                        onApprove={() => undefined}
                        onReject={() => undefined}
                        onRemove={() => setRemoveTarget(enrollment)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </TeacherAccessGate>

        {removeTarget && (
          <ConfirmDialog
            title="Remove student?"
            description={`Remove @${removeTarget.student.username} from this subject? They will lose access immediately and may request to join again.`}
            confirmLabel="Remove student"
            danger
            onConfirm={() => {
              const target = removeTarget
              setRemoveTarget(null)

              if (!target) {
                return
              }

              void runAction(target.id, () =>
                removeEnrollment(target.id, accessToken ?? ''),
              )
            }}
            onClose={() => setRemoveTarget(null)}
          />
        )}
      </Container>
    </section>
  )
}
