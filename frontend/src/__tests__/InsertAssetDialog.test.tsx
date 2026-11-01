import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InsertAssetDialog } from '../components/content/InsertAssetDialog'
import { ApiError } from '../services/apiClient'

const contentMocks = vi.hoisted(() => ({
  uploadContentAsset: vi.fn(),
}))

vi.mock('../services/topicContentService', () => ({
  uploadContentAsset: contentMocks.uploadContentAsset,
}))

const contentId = '22222222-2222-4222-8222-222222222222'
const pngFile = new File(['mock png'], 'diagram.png', {
  type: 'image/png',
})

const asset = {
  id: '33333333-3333-4333-8333-333333333333',
  originalName: 'diagram.png',
  mimeType: 'image/png',
  sizeBytes: 8,
  fileClass: 'image' as const,
  width: 640,
  height: 480,
  status: 'ready' as const,
  url: 'https://signed.test/image',
  expiresAt: '2026-11-02T01:00:00.000Z',
}

function renderDialog() {
  const onClose = vi.fn()
  const onInserted = vi.fn()

  render(
    <InsertAssetDialog
      kind="image"
      contentId={contentId}
      accessToken="test-token"
      onClose={onClose}
      onInserted={onInserted}
    />,
  )

  return { onClose, onInserted }
}

async function selectFile() {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')

  if (!input) {
    throw new Error('File input not found')
  }

  await userEvent.upload(input, pngFile)
}

describe('InsertAssetDialog', () => {
  beforeEach(() => {
    contentMocks.uploadContentAsset.mockReset()
    contentMocks.uploadContentAsset.mockResolvedValue(asset)
  })

  it('uploads an image and passes alt text to the editor', async () => {
    const user = userEvent.setup()
    const { onInserted } = renderDialog()

    await selectFile()
    expect(await screen.findByText('diagram.png')).toBeInTheDocument()
    expect(screen.getByLabelText('Alt text')).toHaveValue('diagram')

    await user.click(
      screen.getByRole('button', { name: /upload and insert/i }),
    )

    await waitFor(() => {
      expect(contentMocks.uploadContentAsset).toHaveBeenCalledWith(
        contentId,
        { kind: 'image', file: pngFile },
        'test-token',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          onProgress: expect.any(Function),
        }),
      )
    })
    expect(onInserted).toHaveBeenCalledWith(asset, 'diagram')
  })

  it('shows an upload error and lets the user retry', async () => {
    const user = userEvent.setup()
    contentMocks.uploadContentAsset.mockRejectedValue(
      new ApiError('FILE_TOO_LARGE', 'That image is too large.', 413),
    )
    renderDialog()

    await selectFile()
    await user.click(
      screen.getByRole('button', { name: /upload and insert/i }),
    )

    expect(
      await screen.findByText('That image is too large.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument()
  })
})
