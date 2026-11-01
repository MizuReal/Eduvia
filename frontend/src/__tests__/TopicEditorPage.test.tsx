import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TopicEditorPage } from '../pages/TopicEditorPage'

const authState = vi.hoisted(() => ({
  current: {
    status: 'authenticated',
    session: { access_token: 'test-token' },
    profile: {
      id: 'user-1',
      username: 'teacher_one',
      role: 'instructor',
      faculty: 'BSIT',
    },
    profileError: null,
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState.current,
}))

const contentMocks = vi.hoisted(() => ({
  getTopicWorkspace: vi.fn(),
  ensureContent: vi.fn(),
  getContent: vi.fn(),
  updateContent: vi.fn(),
  deleteContent: vi.fn(),
  getFileUrl: vi.fn(),
  uploadPresentation: vi.fn(),
  uploadContentAsset: vi.fn(),
}))

vi.mock('../services/topicContentService', () => contentMocks)

vi.mock('../components/content/SlidesEditorPanel', () => ({
  SlidesEditorPanel: ({
    isActive,
    onDirtyChange,
  }: {
    isActive: boolean
    onDirtyChange: (dirty: boolean) => void
  }) => (
    <div>
      <p>Slides editor ({isActive ? 'active' : 'inactive'})</p>
      <button type="button" onClick={() => onDirtyChange(true)}>
        Mark slides dirty
      </button>
    </div>
  ),
}))

vi.mock('../components/content/DocsEditorPanel', () => ({
  DocsEditorPanel: ({
    isActive,
    onDirtyChange,
  }: {
    isActive: boolean
    onDirtyChange: (dirty: boolean) => void
  }) => (
    <div>
      <p>Docs editor ({isActive ? 'active' : 'inactive'})</p>
      <button type="button" onClick={() => onDirtyChange(true)}>
        Mark docs dirty
      </button>
    </div>
  ),
}))

vi.mock('../components/content/UploadPanel', () => ({
  UploadPanel: () => <p>Upload panel</p>,
}))

const courseId = 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8'
const topicId = '11111111-1111-4111-8111-111111111111'
const slidesId = '22222222-2222-4222-8222-222222222222'
const docId = '33333333-3333-4333-8333-333333333333'
const timestamp = '2026-11-02T00:00:00.000Z'

const slidesItem = {
  id: slidesId,
  courseId,
  topicId,
  kind: 'slides' as const,
  title: 'Week 1',
  content: {
    version: 1 as const,
    slides: [
      {
        id: '44444444-4444-4444-8444-444444444444',
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
      },
    ],
  },
  summary: null,
  file: null,
  assets: [],
  orderIndex: 0,
  slideCount: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const docItem = {
  id: docId,
  courseId,
  topicId,
  kind: 'doc' as const,
  title: 'Reading notes',
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  summary: null,
  file: null,
  assets: [],
  orderIndex: 0,
  slideCount: null,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const workspace = {
  topic: { id: topicId, title: 'HTML and CSS', courseId },
  slides: slidesItem,
  doc: docItem,
  upload: null,
}

function renderPage(entry = `/teacher/subjects/${courseId}/topics/${topicId}`) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/teacher/subjects/:courseId/topics/:topicId"
          element={<TopicEditorPage onOpenAuth={vi.fn()} />}
        />
        <Route
          path="/teacher/subjects/:courseId"
          element={<p>Subject outline</p>}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TopicEditorPage', () => {
  beforeEach(() => {
    Object.values(contentMocks).forEach((mock) => mock.mockReset())
    contentMocks.getTopicWorkspace.mockResolvedValue(workspace)
    contentMocks.ensureContent.mockImplementation(
      (_topic: string, kind: 'slides' | 'doc') =>
        Promise.resolve(kind === 'slides' ? slidesItem : docItem),
    )
  })

  it('opens on the PPTX editor and swaps tabs', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'HTML and CSS' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /pptx/i }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Slides editor (active)')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /docs/i })).toHaveAttribute(
      'aria-selected',
      'false',
    )

    await user.click(screen.getByRole('tab', { name: /docs/i }))

    expect(screen.getByRole('tab', { name: /docs/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('Docs editor (active)')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /upload/i })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('opens the upload tab from the URL', async () => {
    renderPage(
      `/teacher/subjects/${courseId}/topics/${topicId}?tab=upload`,
    )

    expect(
      await screen.findByRole('tab', { name: /upload/i }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Upload panel')).toBeInTheDocument()
  })

  it('creates missing slides and documents before opening the editors', async () => {
    contentMocks.getTopicWorkspace.mockResolvedValue({
      ...workspace,
      slides: null,
      doc: null,
    })
    renderPage()

    await waitFor(() => {
      expect(contentMocks.ensureContent).toHaveBeenCalledWith(
        topicId,
        'slides',
        'test-token',
      )
      expect(contentMocks.ensureContent).toHaveBeenCalledWith(
        topicId,
        'doc',
        'test-token',
      )
    })
    expect(await screen.findByText('Slides editor (active)')).toBeInTheDocument()
    expect(screen.getByText('Docs editor (inactive)')).toBeInTheDocument()
  })

  it('guards the back link when either editor is dirty', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Slides editor (active)')
    await user.click(
      screen.getByRole('button', { name: 'Mark slides dirty' }),
    )
    await user.click(
      screen.getByRole('link', { name: /back to subject outline/i }),
    )

    const dialog = await screen.findByRole('alertdialog', {
      name: /discard changes/i,
    })
    await user.click(within(dialog).getByRole('button', { name: 'Discard' }))

    expect(await screen.findByText('Subject outline')).toBeInTheDocument()
  })
})
