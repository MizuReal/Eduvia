import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../src/errors/AppError.js'
import { validateUploadedFile } from '../src/services/uploadService.js'

const { fileTypeFromFileMock } = vi.hoisted(() => ({
  fileTypeFromFileMock: vi.fn(),
}))

vi.mock('file-type', () => ({
  fileTypeFromFile: fileTypeFromFileMock,
}))

const tempDirectories: string[] = []

function createMulterFile(
  path: string,
  originalname: string,
  size: number,
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype: 'application/octet-stream',
    size,
    destination: '',
    filename: '',
    path,
    buffer: Buffer.alloc(0),
    stream: Readable.from([]),
  }
}

async function writeTempFile(name: string, data: Buffer): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'eduvia-upload-test-'))
  tempDirectories.push(directory)
  const path = join(directory, name)
  await writeFile(path, data)
  return path
}

async function expectAppError(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code })
}

describe('presentation and asset file validation', () => {
  beforeEach(() => {
    fileTypeFromFileMock.mockReset()
  })

  afterEach(async () => {
    await Promise.all(
      tempDirectories.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true }),
      ),
    )
  })

  it('accepts a PPTX presentation', async () => {
    const path = await writeTempFile('week-1.pptx', Buffer.from('mock pptx'))
    fileTypeFromFileMock.mockResolvedValue({
      ext: 'pptx',
      mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })

    const result = await validateUploadedFile(
      createMulterFile(path, 'week-1.pptx', 9),
      'presentation',
    )

    expect(result.fileClass).toBe('document')
    expect(result.mimeType).toContain('presentationml.presentation')
    expect(result.checksumSha256).toHaveLength(64)
  })

  it('accepts a PDF presentation', async () => {
    const path = await writeTempFile('week-1.pdf', Buffer.from('%PDF-1.7'))
    fileTypeFromFileMock.mockResolvedValue({
      ext: 'pdf',
      mime: 'application/pdf',
    })

    const result = await validateUploadedFile(
      createMulterFile(path, 'week-1.pdf', 8),
      'presentation',
    )

    expect(result.fileClass).toBe('document')
    expect(result.mimeType).toBe('application/pdf')
  })

  it('rejects an unlisted extension', async () => {
    const path = await writeTempFile('week-1.docm', Buffer.from('mock'))

    await expectAppError(
      validateUploadedFile(
        createMulterFile(path, 'week-1.docm', 4),
        'presentation',
      ),
      'FILE_TYPE_NOT_ALLOWED',
    )
  })

  it('rejects a renamed file whose magic bytes do not match', async () => {
    const path = await writeTempFile('week-1.pptx', Buffer.from('%PDF-1.7'))
    fileTypeFromFileMock.mockResolvedValue({
      ext: 'pdf',
      mime: 'application/pdf',
    })

    await expectAppError(
      validateUploadedFile(
        createMulterFile(path, 'week-1.pptx', 8),
        'presentation',
      ),
      'FILE_CONTENT_MISMATCH',
    )
  })

  it('accepts UTF-8 markdown attachments', async () => {
    const path = await writeTempFile(
      'notes.md',
      Buffer.from('# Notes\n\nA valid markdown file.'),
    )
    fileTypeFromFileMock.mockResolvedValue(undefined)

    const result = await validateUploadedFile(
      createMulterFile(path, 'notes.md', 28),
      'document',
    )

    expect(result.fileClass).toBe('document')
    expect(result.mimeType).toBe('text/markdown')
  })

  it('rejects binary content disguised as markdown', async () => {
    const path = await writeTempFile(
      'notes.md',
      Buffer.from([0x23, 0x00, 0x01, 0x02]),
    )
    fileTypeFromFileMock.mockResolvedValue(undefined)

    await expectAppError(
      validateUploadedFile(
        createMulterFile(path, 'notes.md', 4),
        'document',
      ),
      'FILE_CONTENT_MISMATCH',
    )
  })

  it('normalizes a valid image and records its dimensions', async () => {
    const png = await sharp({
      create: {
        width: 2,
        height: 3,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer()
    const path = await writeTempFile('diagram.png', png)
    fileTypeFromFileMock.mockResolvedValue({
      ext: 'png',
      mime: 'image/png',
    })

    const result = await validateUploadedFile(
      createMulterFile(path, 'diagram.png', png.length),
      'image',
    )

    expect(result.fileClass).toBe('image')
    expect(result.mimeType).toBe('image/png')
    expect(result.width).toBe(2)
    expect(result.height).toBe(3)
    expect(result.buffer.length).toBeGreaterThan(0)
  })

  it('rejects a corrupt image', async () => {
    const path = await writeTempFile('diagram.png', Buffer.from('not a png'))
    fileTypeFromFileMock.mockResolvedValue({
      ext: 'png',
      mime: 'image/png',
    })

    await expectAppError(
      validateUploadedFile(
        createMulterFile(path, 'diagram.png', 9),
        'image',
      ),
      'FILE_CONTENT_MISMATCH',
    )
  })

  it('rejects images over the image limit before processing', async () => {
    const path = await writeTempFile('diagram.png', Buffer.from('small'))

    const promise = validateUploadedFile(
      createMulterFile(path, 'diagram.png', 11 * 1024 * 1024),
      'image',
    )

    await expect(promise).rejects.toBeInstanceOf(AppError)
    await expectAppError(promise, 'FILE_TOO_LARGE')
  })
})
