import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import type { NodeViewProps } from '@tiptap/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CourseFileNodeView } from '../components/content/CourseFileNodeView'
import { CourseImageNodeView } from '../components/content/CourseImageNodeView'
import type { TopicAsset } from '../types/topicContent'

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock('../components/content/AltTextDialog', () => ({
  AltTextDialog: ({
    onSave,
    onClose,
  }: {
    onSave: (alt: string) => void
    onClose: () => void
  }) => (
    <div role="dialog" aria-label="Image alt text">
      <button type="button" onClick={() => onSave('Updated alt')}>
        Save alt
      </button>
      <button type="button" onClick={onClose}>
        Cancel alt
      </button>
    </div>
  ),
}))

const assetState = vi.hoisted(() => ({
  current: {
    asset: null as TopicAsset | null,
    refreshAsset: vi.fn(),
  },
}))

const openSignedUrlMock = vi.hoisted(() => vi.fn())

vi.mock('../components/content/openSignedUrl', () => ({
  openSignedUrl: openSignedUrlMock,
}))

vi.mock('../components/content/useTopicAsset', () => ({
  useTopicAsset: () => assetState.current,
}))

const fileId = '33333333-3333-4333-8333-333333333333'
const timestamp = '2026-11-02T00:00:00.000Z'

const imageAsset: TopicAsset = {
  id: fileId,
  originalName: 'diagram.png',
  mimeType: 'image/png',
  sizeBytes: 2048,
  fileClass: 'image',
  width: 640,
  height: 480,
  status: 'ready',
  url: 'https://signed.test/image',
  expiresAt: timestamp,
}

const documentAsset: TopicAsset = {
  ...imageAsset,
  originalName: 'notes.pdf',
  mimeType: 'application/pdf',
  fileClass: 'document',
  width: null,
  height: null,
  url: 'https://signed.test/file',
}

function imageProps(): NodeViewProps {
  return {
    node: {
      type: { name: 'courseImage' },
      attrs: { fileId, alt: 'Architecture diagram' },
    },
    editor: { isEditable: true },
    selected: false,
    updateAttributes: vi.fn(),
    deleteNode: vi.fn(),
  } as unknown as NodeViewProps
}

function fileProps(): NodeViewProps {
  return {
    node: {
      type: { name: 'courseFile' },
      attrs: { fileId },
    },
    editor: { isEditable: true },
    selected: false,
    updateAttributes: vi.fn(),
    deleteNode: vi.fn(),
  } as unknown as NodeViewProps
}

describe('embedded content node views', () => {
  beforeEach(() => {
    assetState.current.refreshAsset.mockReset()
    assetState.current.refreshAsset.mockResolvedValue(imageAsset)
    openSignedUrlMock.mockReset()
  })

  it('renders an image with alt text and removes it', async () => {
    const user = userEvent.setup()
    const props = imageProps()
    assetState.current.asset = imageAsset

    render(<CourseImageNodeView {...props} />)

    const image = screen.getByRole('img', { name: 'Architecture diagram' })
    expect(image).toHaveAttribute('src', 'https://signed.test/image')
    expect(image).toHaveAttribute('width', '640')

    await user.click(screen.getByRole('button', { name: 'Remove image' }))
    expect(props.deleteNode).toHaveBeenCalled()
  })

  it('updates alt text from the node view', async () => {
    const user = userEvent.setup()
    const props = imageProps()
    assetState.current.asset = imageAsset

    render(<CourseImageNodeView {...props} />)

    await user.click(
      screen.getByRole('button', { name: 'Edit image alt text' }),
    )
    await user.click(screen.getByRole('button', { name: 'Save alt' }))

    expect(props.updateAttributes).toHaveBeenCalledWith({ alt: 'Updated alt' })
  })

  it('shows a retry state for an unavailable image', async () => {
    const user = userEvent.setup()
    assetState.current.asset = null
    assetState.current.refreshAsset.mockResolvedValue(imageAsset)

    render(<CourseImageNodeView {...imageProps()} />)

    expect(screen.getByText(/image is not available/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(assetState.current.refreshAsset).toHaveBeenCalledWith(fileId)
  })

  it('renders an attachment and opens a fresh signed URL', async () => {
    const user = userEvent.setup()
    assetState.current.asset = documentAsset
    assetState.current.refreshAsset.mockResolvedValue(documentAsset)

    render(<CourseFileNodeView {...fileProps()} />)

    expect(screen.getByText('notes.pdf')).toBeInTheDocument()
    expect(screen.getByText('application/pdf · 2.0 KB')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open file' }))

    await waitFor(() => {
      expect(assetState.current.refreshAsset).toHaveBeenCalledWith(fileId)
      expect(openSignedUrlMock).toHaveBeenCalledWith(
        'https://signed.test/file',
      )
    })
  })

  it('removes an attachment', async () => {
    const user = userEvent.setup()
    const props = fileProps()
    assetState.current.asset = documentAsset

    render(<CourseFileNodeView {...props} />)

    await user.click(screen.getByRole('button', { name: 'Remove attachment' }))
    expect(props.deleteNode).toHaveBeenCalled()
  })
})
