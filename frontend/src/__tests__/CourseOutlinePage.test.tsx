import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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
  deleteLesson: vi.fn(),
  deleteTopic: vi.fn(),
  getCourseOutline: vi.fn(),
  getTrash: vi.fn(),
  reorderLessons: vi.fn(),
  reorderTopics: vi.fn(),
  restoreLesson: vi.fn(),
  restoreTopic: vi.fn(),
  updateLesson: vi.fn(),
  updateTopic: vi.fn(),
}))

vi.mock('../services/courseOutlineService', () => outlineMocks)

const courseId = 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8'
const topicId = '11111111-1111-4111-8111-111111111111'
const secondTopicId = '55555555-5555-4555-8555-555555555555'
const lessonId = '22222222-2222-4222-8222-222222222222'
const secondLessonId = '44444444-4444-4444-8444-444444444444'
const timestamp = '2026-11-02T00:00:00.000Z'

const lesson = {
  id: lessonId,
  topicId,
  title: 'Semantic HTML',
  orderIndex: 0,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const secondLesson = {
  id: secondLessonId,
  topicId,
  title: 'CSS Layout',
  orderIndex: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const topic = {
  id: topicId,
  title: 'HTML and CSS',
  orderIndex: 0,
  lessons: [lesson],
  createdAt: timestamp,
  updatedAt: timestamp,
}

const secondTopic = {
  id: secondTopicId,
  title: 'JavaScript',
  orderIndex: 1,
  lessons: [],
  createdAt: timestamp,
  updatedAt: timestamp,
}

const outline = {
  id: courseId,
  name: 'ITPE2',
  code: 'IT-ITPE2',
  term: 'first_trimester' as const,
  yearLevel: 3 as const,
  createdAt: timestamp,
  updatedAt: timestamp,
  topics: [topic],
}

const outlineWithTwoTopics = {
  ...outline,
  topics: [topic, secondTopic],
}

const outlineWithTwoLessons = {
  ...outline,
  topics: [{ ...topic, lessons: [lesson, secondLesson] }],
}

const newTopic = {
  id: '33333333-3333-4333-8333-333333333333',
  title: 'JavaScript',
  orderIndex: 1,
  lessons: [],
  createdAt: timestamp,
  updatedAt: timestamp,
}

const newLesson = {
  id: '66666666-6666-4666-8666-666666666666',
  topicId,
  title: 'Flexbox',
  orderIndex: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
}

function LocationProbe() {
  const location = useLocation()

  return <p>{`${location.pathname}${location.search}`}</p>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/teacher/subjects/${courseId}`]}>
      <Routes>
        <Route
          path="/teacher/subjects/:courseId"
          element={<CourseOutlinePage onOpenAuth={vi.fn()} />}
        />
        <Route
          path="/teacher/subjects/:courseId/topics/:topicId"
          element={<LocationProbe />}
        />
        <Route
          path="/teacher/subjects/:courseId/topics/:topicId/results"
          element={<LocationProbe />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CourseOutlinePage', () => {
  beforeEach(() => {
    Object.values(outlineMocks).forEach((mock) => mock.mockReset())
    outlineMocks.getCourseOutline.mockResolvedValue(outline)
    outlineMocks.createTopic.mockResolvedValue(newTopic)
    outlineMocks.createLesson.mockResolvedValue(newLesson)
    outlineMocks.getTrash.mockResolvedValue({ topics: [], lessons: [] })
    outlineMocks.updateTopic.mockResolvedValue({
      ...topic,
      title: 'Updated topic',
    })
    outlineMocks.updateLesson.mockResolvedValue({
      ...lesson,
      title: 'Updated lesson',
    })
    outlineMocks.deleteTopic.mockResolvedValue(undefined)
    outlineMocks.deleteLesson.mockResolvedValue(undefined)
    outlineMocks.reorderTopics.mockResolvedValue({ topicIds: [] })
    outlineMocks.reorderLessons.mockResolvedValue({ lessonIds: [] })
    outlineMocks.restoreTopic.mockResolvedValue(secondTopic)
    outlineMocks.restoreLesson.mockResolvedValue(secondLesson)
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

  it('shows prominent manage content, quiz, and results actions for each topic', async () => {
    renderPage()

    const tableOfContents = await screen.findByRole('region', {
      name: 'Table of contents',
    })

    expect(
      within(tableOfContents).getAllByRole('button', {
        name: 'Manage content',
      }),
    ).toHaveLength(1)
    expect(
      within(tableOfContents).getAllByRole('button', {
        name: 'Make a quiz',
      }),
    ).toHaveLength(1)
    expect(
      within(tableOfContents).getAllByRole('button', {
        name: 'Results',
      }),
    ).toHaveLength(1)
  })

  it('opens the results summary from the topic results action', async () => {
    const user = userEvent.setup()
    renderPage()

    const tableOfContents = await screen.findByRole('region', {
      name: 'Table of contents',
    })

    await user.click(
      within(tableOfContents).getByRole('button', { name: 'Results' }),
    )

    expect(
      await screen.findByText(
        `/teacher/subjects/${courseId}/topics/${topicId}/results`,
      ),
    ).toBeInTheDocument()
  })

  it('opens the quiz tab from the make a quiz action', async () => {
    const user = userEvent.setup()
    renderPage()

    const tableOfContents = await screen.findByRole('region', {
      name: 'Table of contents',
    })
    const quizButtons = within(tableOfContents).getAllByRole('button', {
      name: 'Make a quiz',
    })

    await user.click(quizButtons[0] as HTMLElement)

    expect(
      await screen.findByText(
        `/teacher/subjects/${courseId}/topics/${topicId}?tab=quiz`,
      ),
    ).toBeInTheDocument()
  })

  it('keeps manage content on the topic editor default tab', async () => {
    const user = userEvent.setup()
    renderPage()

    const tableOfContents = await screen.findByRole('region', {
      name: 'Table of contents',
    })

    await user.click(
      within(tableOfContents).getByRole('button', {
        name: 'Manage content',
      }),
    )

    expect(
      await screen.findByText(`/teacher/subjects/${courseId}/topics/${topicId}`),
    ).toBeInTheDocument()
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
      courseId,
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
    await user.selectOptions(screen.getByLabelText('Topic'), topicId)
    await user.type(screen.getByLabelText('Lesson title'), 'Flexbox')
    await user.click(screen.getByRole('button', { name: 'Add lesson' }))

    expect(
      await within(tableOfContents).findByText('Flexbox'),
    ).toBeInTheDocument()
    expect(outlineMocks.createLesson).toHaveBeenCalledWith(
      courseId,
      { topicId, title: 'Flexbox' },
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

  it('edits a topic title', async () => {
    const user = userEvent.setup()
    renderPage()

    const tableOfContents = await screen.findByRole('region', {
      name: 'Table of contents',
    })
    await user.click(
      within(tableOfContents).getByRole('button', {
        name: 'Edit topic HTML and CSS',
      }),
    )

    const dialog = await screen.findByRole('dialog', { name: 'Edit topic' })
    const title = within(dialog).getByLabelText('Topic title')
    await user.clear(title)
    await user.type(title, 'Updated topic')
    await user.click(within(dialog).getByRole('button', { name: 'Save topic' }))

    expect(
      await within(tableOfContents).findByText('Updated topic'),
    ).toBeInTheDocument()
    expect(outlineMocks.updateTopic).toHaveBeenCalledWith(
      topicId,
      { title: 'Updated topic' },
      'test-token',
    )
  })

  it('deletes a topic after confirmation', async () => {
    const user = userEvent.setup()
    renderPage()

    const tableOfContents = await screen.findByRole('region', {
      name: 'Table of contents',
    })
    await user.click(
      within(tableOfContents).getByRole('button', {
        name: 'Delete topic HTML and CSS',
      }),
    )

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Delete topic?',
    })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(
        within(tableOfContents).queryByText('HTML and CSS'),
      ).not.toBeInTheDocument()
    })
    expect(outlineMocks.deleteTopic).toHaveBeenCalledWith(topicId, 'test-token')
  })

  it('reorders topics with the accessible move control', async () => {
    outlineMocks.getCourseOutline.mockResolvedValue(outlineWithTwoTopics)
    const user = userEvent.setup()
    renderPage()

    const tableOfContents = await screen.findByRole('region', {
      name: 'Table of contents',
    })
    await user.click(
      within(tableOfContents).getByRole('button', {
        name: 'Move topic JavaScript up',
      }),
    )

    expect(outlineMocks.reorderTopics).toHaveBeenCalledWith(
      courseId,
      [secondTopicId, topicId],
      'test-token',
    )
  })

  it('reorders lessons with the accessible move control', async () => {
    outlineMocks.getCourseOutline.mockResolvedValue(outlineWithTwoLessons)
    const user = userEvent.setup()
    renderPage()

    const tableOfContents = await screen.findByRole('region', {
      name: 'Table of contents',
    })
    await user.click(
      within(tableOfContents).getByRole('button', {
        name: 'Move lesson CSS Layout up',
      }),
    )

    expect(outlineMocks.reorderLessons).toHaveBeenCalledWith(
      topicId,
      [secondLessonId, lessonId],
      'test-token',
    )
  })

  it('edits a lesson and moves it to another topic', async () => {
    outlineMocks.getCourseOutline.mockResolvedValue(outlineWithTwoTopics)
    outlineMocks.updateLesson.mockResolvedValue({
      ...lesson,
      title: 'Updated lesson',
      topicId: secondTopicId,
    })
    const user = userEvent.setup()
    renderPage()

    const tableOfContents = await screen.findByRole('region', {
      name: 'Table of contents',
    })
    await user.click(
      within(tableOfContents).getByRole('button', {
        name: 'Edit lesson Semantic HTML',
      }),
    )

    const dialog = await screen.findByRole('dialog', { name: 'Edit lesson' })
    const title = within(dialog).getByLabelText('Lesson title')
    await user.clear(title)
    await user.type(title, 'Updated lesson')
    await user.selectOptions(
      within(dialog).getByLabelText('Topic'),
      secondTopicId,
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Save lesson' }),
    )

    expect(
      await within(tableOfContents).findByText('Updated lesson'),
    ).toBeInTheDocument()
    expect(outlineMocks.updateLesson).toHaveBeenCalledWith(
      lessonId,
      { title: 'Updated lesson', topicId: secondTopicId },
      'test-token',
    )
  })

  it('deletes a lesson after confirmation', async () => {
    const user = userEvent.setup()
    renderPage()

    const tableOfContents = await screen.findByRole('region', {
      name: 'Table of contents',
    })
    await user.click(
      within(tableOfContents).getByRole('button', {
        name: 'Delete lesson Semantic HTML',
      }),
    )

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Delete lesson?',
    })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(
        within(tableOfContents).queryByText('Semantic HTML'),
      ).not.toBeInTheDocument()
    })
    expect(outlineMocks.deleteLesson).toHaveBeenCalledWith(
      lessonId,
      'test-token',
    )
  })

  it('restores a deleted topic from the trash panel', async () => {
    outlineMocks.getTrash.mockResolvedValue({
      topics: [
        {
          id: secondTopicId,
          title: 'JavaScript',
          deletedAt: timestamp,
          lessonCount: 0,
        },
      ],
      lessons: [],
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByText('Deleted items'))
    expect(await screen.findByText('Deleted topics')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restore' }))

    expect(outlineMocks.restoreTopic).toHaveBeenCalledWith(
      secondTopicId,
      'test-token',
    )
    const tableOfContents = screen.getByRole('region', {
      name: 'Table of contents',
    })
    expect(
      await within(tableOfContents).findByText('JavaScript'),
    ).toBeInTheDocument()
  })

  it('restores a deleted lesson from the trash panel', async () => {
    outlineMocks.getTrash.mockResolvedValue({
      topics: [],
      lessons: [
        {
          id: secondLessonId,
          title: 'CSS Layout',
          topicId,
          topicTitle: 'HTML and CSS',
          deletedAt: timestamp,
          restorable: true,
        },
      ],
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByText('Deleted items'))
    expect(await screen.findByText('Deleted lessons')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restore' }))

    expect(outlineMocks.restoreLesson).toHaveBeenCalledWith(
      secondLessonId,
      'test-token',
    )
    const tableOfContents = screen.getByRole('region', {
      name: 'Table of contents',
    })
    expect(
      await within(tableOfContents).findByText('CSS Layout'),
    ).toBeInTheDocument()
  })
})
