import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeacherPage } from '../pages/TeacherPage'
import { ApiError } from '../services/apiClient'

type MockProfile = {
  id: string
  username: string
  role: 'student' | 'instructor' | 'admin'
  faculty: 'BSIT' | 'BSEE' | 'BSME'
}

type MockAuthState = {
  status: 'loading' | 'authenticated' | 'anonymous'
  session: { access_token: string } | null
  profile: MockProfile | null
  profileError: string | null
}

const authState = vi.hoisted(() => {
  const current: MockAuthState = {
    status: 'authenticated',
    session: { access_token: 'test-token' },
    profile: {
      id: 'user-1',
      username: 'teacher_one',
      role: 'instructor',
      faculty: 'BSIT',
    },
    profileError: null,
  }

  return { current }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState.current,
}))

const courseMocks = vi.hoisted(() => ({
  listCourses: vi.fn(),
  createCourse: vi.fn(),
}))

vi.mock('../services/courseService', () => courseMocks)

const course = {
  id: 'course-1',
  name: 'Web Systems',
  code: 'IT301',
  term: 'first_trimester' as const,
  yearLevel: 3 as const,
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
}

function instructorAuth() {
  authState.current = {
    status: 'authenticated',
    session: { access_token: 'test-token' },
    profile: {
      id: 'user-1',
      username: 'teacher_one',
      role: 'instructor',
      faculty: 'BSIT',
    },
    profileError: null,
  }
}

function renderTeacherPage(onOpenAuth = vi.fn()) {
  return render(
    <MemoryRouter>
      <TeacherPage onOpenAuth={onOpenAuth} />
    </MemoryRouter>,
  )
}

async function fillSubjectForm(customCode?: string) {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Subject name'), 'Web Systems')

  if (customCode) {
    await user.click(screen.getByRole('button', { name: 'Use custom code' }))
    const codeInput = screen.getByLabelText('Subject code')
    await user.clear(codeInput)
    await user.type(codeInput, customCode)
  }

  await user.selectOptions(
    screen.getByLabelText('Trimester'),
    'first_trimester',
  )
  await user.selectOptions(screen.getByLabelText('Year level'), '3')

  return user
}

describe('TeacherPage', () => {
  beforeEach(() => {
    courseMocks.listCourses.mockReset()
    courseMocks.createCourse.mockReset()
    courseMocks.listCourses.mockResolvedValue([])
    instructorAuth()
  })

  it('asks anonymous users to sign in', async () => {
    const user = userEvent.setup()
    const onOpenAuth = vi.fn()
    authState.current = {
      status: 'anonymous',
      session: null,
      profile: null,
      profileError: null,
    }

    renderTeacherPage(onOpenAuth)

    expect(
      screen.getByRole('heading', { name: 'Subjects' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Sign in to manage your subjects',
      }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(onOpenAuth).toHaveBeenCalledWith('login')
    expect(courseMocks.listCourses).not.toHaveBeenCalled()
  })

  it('denies students', () => {
    authState.current = {
      ...authState.current,
      profile: {
        id: 'user-1',
        username: 'student_one',
        role: 'student',
        faculty: 'BSIT',
      },
    }

    renderTeacherPage()

    expect(
      screen.getByRole('heading', { name: 'Teacher access required' }),
    ).toBeInTheDocument()
    expect(courseMocks.listCourses).not.toHaveBeenCalled()
  })

  it('renders an instructor subject list', async () => {
    courseMocks.listCourses.mockResolvedValue([course])

    renderTeacherPage()

    expect(await screen.findByText('Web Systems')).toBeInTheDocument()

    const subjectList = screen.getByRole('region', { name: 'Your subjects' })
    expect(within(subjectList).getByText('IT301')).toBeInTheDocument()
    expect(within(subjectList).getByText('1st Trimester')).toBeInTheDocument()
    expect(within(subjectList).getByText('3rd Year')).toBeInTheDocument()
  })

  it('previews an automatic subject code from the name', async () => {
    const user = userEvent.setup()
    renderTeacherPage()

    await screen.findByText('No subjects yet')
    await user.type(
      screen.getByLabelText('Subject name'),
      'Web Systems and Technologies',
    )

    expect(screen.getByText('WST')).toBeInTheDocument()
  })

  it('submits a custom subject code', async () => {
    courseMocks.createCourse.mockResolvedValue({
      ...course,
      code: 'WST101',
    })
    renderTeacherPage()

    await screen.findByText('No subjects yet')
    const user = await fillSubjectForm('WST101')
    await user.click(screen.getByRole('button', { name: 'Create subject' }))

    expect(
      await screen.findByText('Subject created with code WST101.'),
    ).toBeInTheDocument()
    expect(courseMocks.createCourse).toHaveBeenCalledWith(
      {
        name: 'Web Systems',
        code: 'WST101',
        term: 'first_trimester',
        yearLevel: 3,
      },
      'test-token',
    )
  })

  it('validates the form before submitting', async () => {
    const user = userEvent.setup()
    renderTeacherPage()

    await screen.findByText('No subjects yet')
    await user.click(screen.getByRole('button', { name: 'Create subject' }))

    expect(screen.getByText('Use 3–120 characters.')).toBeInTheDocument()
    expect(screen.getByText('Select a trimester.')).toBeInTheDocument()
    expect(screen.getByText('Select a year level.')).toBeInTheDocument()
    expect(courseMocks.createCourse).not.toHaveBeenCalled()
  })

  it('creates a subject and adds it to the list', async () => {
    courseMocks.createCourse.mockResolvedValue(course)
    renderTeacherPage()

    await screen.findByText('No subjects yet')
    const user = await fillSubjectForm()
    await user.click(screen.getByRole('button', { name: 'Create subject' }))

    expect(
      await screen.findByText('Subject created with code IT301.'),
    ).toBeInTheDocument()
    expect(courseMocks.createCourse).toHaveBeenCalledWith(
      {
        name: 'Web Systems',
        term: 'first_trimester',
        yearLevel: 3,
      },
      'test-token',
    )
    expect(await screen.findByText('Web Systems')).toBeInTheDocument()
  })

  it('maps a duplicate subject code to the code field', async () => {
    courseMocks.createCourse.mockRejectedValue(
      new ApiError(
        'COURSE_CODE_TAKEN',
        'That subject code is already used for this trimester and year level.',
        409,
      ),
    )
    renderTeacherPage()

    await screen.findByText('No subjects yet')
    const user = await fillSubjectForm('IT301')
    await user.click(screen.getByRole('button', { name: 'Create subject' }))

    expect(
      await screen.findByText(
        'That subject code is already used for this trimester and year level.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Subject code')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})
