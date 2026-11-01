import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PresentationUploadForm } from '../components/content/PresentationUploadForm'
import { ApiError } from '../services/apiClient'

const contentMocks = vi.hoisted(() => ({
  uploadPresentation: vi.fn(),
}))

vi.mock('../services/topicContentService', () => ({
  uploadPresentation: contentMocks.uploadPresentation,
}))

const topicId = '11111111-1111-4111-8111-111111111111'
const pptxFile = new File(['mock pptx'], 'week-1.pptx', {
  type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
})

const presentationItem = {
  id: '22222222-2222-4222-8222-222222222222',
  courseId: 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8',
  topicId,
  kind: 'presentation' as const,
  title: 'week 1',
  content: {},
  summary: 'A presentation summary that is long enough.',
  file: {
    id: '33333333-3333-4333-8333-333333333333',
    originalName: 'week-1.pptx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sizeBytes: 9,
    fileClass: 'document' as const,
    width: null,
    height: null,
    status: 'ready' as const,
  },
  assets: [] as [],
  orderIndex: 0,
  slideCount: null,
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
}

function renderForm(overrides: Partial<Parameters<typeof PresentationUploadForm>[0]> = {}) {
  const onUploaded = vi.fn()
  const onCancel = vi.fn()

  render(
    <PresentationUploadForm
      topicId={topicId}
      accessToken="test-token"
      heading="Upload presentation"
      description="Keep the original file and add a summary."
      submitLabel="Upload presentation"
      onUploaded={onUploaded}
      onCancel={onCancel}
      {...overrides}
    />,
  )

  return { onUploaded, onCancel }
}

async function selectFile() {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')

  if (!input) {
    throw new Error('File input not found')
  }

  await userEvent.upload(input, pptxFile)
}

describe('PresentationUploadForm', () => {
  beforeEach(() => {
    contentMocks.uploadPresentation.mockReset()
    contentMocks.uploadPresentation.mockResolvedValue(presentationItem)
  })

  it('requires a file before uploading', () => {
    renderForm()

    expect(
      screen.getByRole('button', { name: /upload presentation/i }),
    ).toBeDisabled()
    expect(contentMocks.uploadPresentation).not.toHaveBeenCalled()
  })

  it('uploads a presentation with a title and summary', async () => {
    const user = userEvent.setup()
    const { onUploaded } = renderForm()

    await selectFile()

    expect(await screen.findByText('week-1.pptx')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('week 1')

    await user.type(
      screen.getByLabelText('Summary'),
      'A presentation summary that is long enough.',
    )
    await user.click(
      screen.getByRole('button', { name: /upload presentation/i }),
    )

    await waitFor(() => {
      expect(contentMocks.uploadPresentation).toHaveBeenCalledWith(
        topicId,
        expect.objectContaining({
          file: pptxFile,
          title: 'week 1',
          summary: 'A presentation summary that is long enough.',
        }),
        'test-token',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          onProgress: expect.any(Function),
        }),
      )
    })
    expect(onUploaded).toHaveBeenCalledWith(presentationItem)
  })

  it('shows an error and allows retry', async () => {
    const user = userEvent.setup()
    contentMocks.uploadPresentation.mockRejectedValue(
      new ApiError('FILE_TOO_LARGE', 'That file is too large.', 413),
    )
    renderForm()

    await selectFile()
    await user.type(
      screen.getByLabelText('Summary'),
      'A presentation summary that is long enough.',
    )
    await user.click(
      screen.getByRole('button', { name: /upload presentation/i }),
    )

    expect(
      await screen.findByText('That file is too large.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument()
  })

  it('prefills replacement details and supports cancelling', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderForm({
      heading: 'Replace presentation',
      submitLabel: 'Replace presentation',
      initialTitle: 'Existing title',
      initialSummary: 'An existing summary that is long enough to be valid.',
    })

    expect(screen.getByLabelText('Title')).toHaveValue('Existing title')
    expect(screen.getByLabelText('Summary')).toHaveValue(
      'An existing summary that is long enough to be valid.',
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
