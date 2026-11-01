import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UploadPanel } from '../components/content/UploadPanel'

const contentMocks = vi.hoisted(() => ({
  deleteContent: vi.fn(),
  updateContent: vi.fn(),
  getFileUrl: vi.fn(),
  uploadPresentation: vi.fn(),
  uploadContentAsset: vi.fn(),
  getContent: vi.fn(),
  getTopicWorkspace: vi.fn(),
  ensureContent: vi.fn(),
}))

vi.mock('../services/topicContentService', () => contentMocks)

const topicId = '11111111-1111-4111-8111-111111111111'
const contentId = '22222222-2222-4222-8222-222222222222'
const timestamp = '2026-11-02T00:00:00.000Z'

const upload = {
  id: contentId,
  courseId: 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8',
  topicId,
  kind: 'presentation' as const,
  title: 'Uploaded lecture',
  content: {},
  summary: 'A presentation summary that is long enough to be valid.',
  file: {
    id: '33333333-3333-4333-8333-333333333333',
    originalName: 'lecture.pptx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sizeBytes: 2048,
    fileClass: 'document' as const,
    width: null,
    height: null,
    status: 'ready' as const,
  },
  assets: [] as [],
  orderIndex: 0,
  slideCount: null,
  createdAt: timestamp,
  updatedAt: timestamp,
}

function renderPanel(uploadValue: typeof upload | null = upload) {
  const onChanged = vi.fn()

  render(
    <UploadPanel
      topicId={topicId}
      accessToken="test-token"
      upload={uploadValue}
      onChanged={onChanged}
    />,
  )

  return { onChanged }
}

describe('UploadPanel', () => {
  beforeEach(() => {
    Object.values(contentMocks).forEach((mock) => mock.mockReset())
    contentMocks.deleteContent.mockResolvedValue(undefined)
  })

  it('shows the uploaded presentation with replace and remove actions', async () => {
    const user = userEvent.setup()
    renderPanel()

    expect(screen.getByText('Uploaded lecture')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /replace/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /replace/i }))
    expect(
      screen.getByRole('heading', { name: 'Replace presentation' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Uploaded lecture')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Uploaded lecture')).toBeInTheDocument()
  })

  it('removes the uploaded presentation after confirmation', async () => {
    const user = userEvent.setup()
    const { onChanged } = renderPanel()

    await user.click(
      screen.getByRole('button', { name: 'Delete Uploaded lecture' }),
    )

    const dialog = await screen.findByRole('alertdialog', {
      name: /remove presentation/i,
    })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(contentMocks.deleteContent).toHaveBeenCalledWith(
        contentId,
        'test-token',
      )
    })
    expect(onChanged).toHaveBeenCalledWith(null)
  })

  it('shows the upload form when no presentation exists', () => {
    renderPanel(null)

    expect(
      screen.getByRole('heading', { name: 'Upload presentation' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /replace/i }),
    ).not.toBeInTheDocument()
  })
})
