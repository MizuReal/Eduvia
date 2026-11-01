import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CourseOutlinePage } from '../pages/CourseOutlinePage'
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

const outlineMocks = vi.hoisted(() => ({
  createLesson: vi.fn(),
  createTopic: vi.fn(),
  getCourseOutline: vi.fn(),
}))

vi.mock('../services/courseOutlineService', () => outlineMocks)

const lesson = {
  id: '22222222-2222-4222-8222-222222222222',
  topicId: '11111111-1111-4111-8111-111111111111',
  title: 'Semantic HTML',
  orderIndex: 0,
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
}

const topic = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'HTML and CSS',
  orderIndex: 0,
  lessons: [lesson],
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
}

const outline = {
  id: 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8',
  name: 'ITPE2',
  code: 'IT-ITPE2',
  term: 'first_trimester' as const,
  yearLevel: 3 as const,
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  topics: [topic],
}

const newTopic = {
  id: '33333333-3333-4333-8333-333333333333',
  title: 'JavaScript',
  orderIndex: 1,
  lessons: [],
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
}

const newLesson = {
  id: '44444444-4444-4444-8444-444444444444',
  topicId: '11111111-1111-4111-8111-111111111111',
  title: 'Flexbox',
  orderIndex: 1,
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        '/teacher/subjects/c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8',
      ]}
    >
      <Routes>
        <Route
          path="/teacher/subjects/:courseId"
          element={<CourseOutlinePage onOpenAuth={vi.fn()} />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CourseOutlinePage', () => {
  beforeEach(() => {
    outlineMocks.createLesson.mockReset()
    outlineMocks.createTopic.mockReset()
    outlineMocks.getCourseOutline.mockReset()
    outlineMocks.getCourseOutline.mockResolvedValue(outline)
    outlineMocks.createTopic.mockResolvedValue(newTopic)
    outlineMocks.createLesson.mockResolvedValue(newLesson)
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
  })

  it('renders the subject table of contents', async () => {
    renderPage()

    const tableOfContents = await screen.findByRole('region', {
      name: 'Table of contents',
    })

    expect(
      within(tableOfContents).getByText('HTML and CSS'),
    ).toBeInTheDocument()
    expect(
      within(tableOfContents).getByText('Semantic HTML'),
    ).toBeInTheDocument()
    expect(within(tableOfContents).getByText('1 lesson')).toBeInTheDocument()
  })

  it('adds a topic', async () => {
    const user = userEvent.setup()
    renderPage()

    const tableOfContents = await screen.findByRole('region', {
      name: 'Table of contents',
    })
    await user.type(screen.getByLabelText('Topic title'), 'JavaScript')
    await user.click(screen.getByRole('button', { name: 'Add topic' }))

    expect(
      await within(tableOfContents).findByText('JavaScript'),
    ).toBeInTheDocument()
    expect(outlineMocks.createTopic).toHaveBeenCalledWith(
      'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8',
      { title: 'JavaScript' },
      'test-token',
    )
  })

  it('adds a lesson under a topic', async () => {
    const user = userEvent.setup()
    renderPage()

    const tableOfContents = await screen.findByRole('region', {
      name: 'Table of contents',
    })
    await user.selectOptions(
      screen.getByLabelText('Topic'),
      '11111111-1111-4111-8111-111111111111',
    )
    await user.type(screen.getByLabelText('Lesson title'), 'Flexbox')
    await user.click(screen.getByRole('button', { name: 'Add lesson' }))

    expect(
      await within(tableOfContents).findByText('Flexbox'),
    ).toBeInTheDocument()
    expect(outlineMocks.createLesson).toHaveBeenCalledWith(
      'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8',
      { topicId: '11111111-1111-4111-8111-111111111111', title: 'Flexbox' },
      'test-token',
    )
  })

  it('validates both forms', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('region', { name: 'Table of contents' })
    await user.click(screen.getByRole('button', { name: 'Add topic' }))
    await user.click(screen.getByRole('button', { name: 'Add lesson' }))

    expect(screen.getByText('Use 2–120 characters.')).toBeInTheDocument()
    expect(screen.getByText('Use 2–160 characters.')).toBeInTheDocument()
    expect(screen.getByText('Select a topic.')).toBeInTheDocument()
    expect(outlineMocks.createTopic).not.toHaveBeenCalled()
    expect(outlineMocks.createLesson).not.toHaveBeenCalled()
  })

  it('shows the empty state when there are no topics', async () => {
    outlineMocks.getCourseOutline.mockResolvedValue({ ...outline, topics: [] })
    renderPage()

    expect(await screen.findByText('No topics yet')).toBeInTheDocument()
    expect(screen.getByLabelText('Topic')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add lesson' })).toBeDisabled()
  })

  it('shows a not-found state for an unavailable subject', async () => {
    outlineMocks.getCourseOutline.mockRejectedValue(
      new ApiError('COURSE_NOT_FOUND', 'Subject not found.', 404),
    )
    renderPage()

    expect(await screen.findByText('Subject not found')).toBeInTheDocument()
  })
})
