import { readFile } from 'node:fs/promises'
import { fileTypeFromFile } from 'file-type'
import sharp from 'sharp'
import {
  DOCUMENT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  IMAGE_MAX_DIMENSION,
  PRESENTATION_EXTENSIONS,
} from '../config/constants.js'
import { env } from '../config/env.js'
import { AppError } from '../errors/AppError.js'
import { calculateChecksum, getFileExtension } from '../utils/files.js'

export type UploadPolicy = 'presentation' | 'image' | 'document'

export type ValidatedUpload = {
  buffer: Buffer
  mimeType: string
  sizeBytes: number
  checksumSha256: string
  fileClass: 'image' | 'document'
  width: number | null
  height: number | null
}

type DetectedType = {
  ext: string
  mime: string
}

const DETECTED_EXTENSION_BY_UPLOAD_EXTENSION: Record<string, string> = {
  '.jpg': 'jpg',
  '.jpeg': 'jpg',
  '.png': 'png',
  '.webp': 'webp',
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.pptx': 'pptx',
}

const IMAGE_FORMAT_BY_MIME: Record<
  string,
  { format: 'jpeg' | 'png' | 'webp'; mimeType: string }
> = {
  'image/jpeg': { format: 'jpeg', mimeType: 'image/jpeg' },
  'image/png': { format: 'png', mimeType: 'image/png' },
  'image/webp': { format: 'webp', mimeType: 'image/webp' },
}

function maxBytesForPolicy(policy: UploadPolicy): number {
  return policy === 'image' ? env.IMAGE_MAX_BYTES : env.DOCUMENT_MAX_BYTES
}

function isAllowedExtension(policy: UploadPolicy, extension: string): boolean {
  if (policy === 'presentation') {
    return (PRESENTATION_EXTENSIONS as readonly string[]).includes(extension)
  }

  if (policy === 'image') {
    return (IMAGE_EXTENSIONS as readonly string[]).includes(extension)
  }

  return (DOCUMENT_EXTENSIONS as readonly string[]).includes(extension)
}

function isTextExtension(extension: string): boolean {
  return extension === '.txt' || extension === '.md'
}

async function detectType(filePath: string): Promise<DetectedType | undefined> {
  const detected = await fileTypeFromFile(filePath)

  return detected ? { ext: detected.ext, mime: detected.mime } : undefined
}

function assertDetectedType(
  extension: string,
  detected: DetectedType | undefined,
): void {
  if (isTextExtension(extension)) {
    if (detected && !detected.mime.startsWith('text/')) {
      throw new AppError(
        415,
        'FILE_CONTENT_MISMATCH',
        'That file type does not match its extension.',
      )
    }

    return
  }

  const expectedExtension = DETECTED_EXTENSION_BY_UPLOAD_EXTENSION[extension]

  if (!detected || !expectedExtension || detected.ext !== expectedExtension) {
    throw new AppError(
      415,
      'FILE_CONTENT_MISMATCH',
      'That file type does not match its extension.',
    )
  }
}

function validateTextFile(buffer: Buffer): void {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)

    if (text.includes('\u0000')) {
      throw new Error('Text files cannot contain null bytes.')
    }
  } catch {
    throw new AppError(
      415,
      'FILE_CONTENT_MISMATCH',
      'That text file is not valid UTF-8 text.',
    )
  }
}

async function processImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{
  buffer: Buffer
  mimeType: string
  width: number
  height: number
}> {
  const format = IMAGE_FORMAT_BY_MIME[mimeType]

  if (!format) {
    throw new AppError(
      415,
      'FILE_TYPE_NOT_ALLOWED',
      'Use a JPEG, PNG, or WebP image.',
    )
  }

  try {
    const image = sharp(buffer, {
      failOn: 'error',
      limitInputPixels: env.IMAGE_MAX_PIXELS,
    })
    const metadata = await image.metadata()

    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > IMAGE_MAX_DIMENSION ||
      metadata.height > IMAGE_MAX_DIMENSION
    ) {
      throw new AppError(
        413,
        'IMAGE_DIMENSIONS_TOO_LARGE',
        'That image is too large. Use an image no larger than 10,000 pixels on either side.',
      )
    }

    if ((metadata.pages ?? 1) > 1) {
      throw new AppError(
        415,
        'FILE_TYPE_NOT_ALLOWED',
        'Animated images are not supported.',
      )
    }

    const processed = await image
      .rotate()
      .toFormat(format.format, { quality: 85 })
      .toBuffer({ resolveWithObject: true })

    if (processed.data.length > env.IMAGE_MAX_BYTES) {
      throw new AppError(
        413,
        'FILE_TOO_LARGE',
        'That image is too large after processing.',
      )
    }

    return {
      buffer: processed.data,
      mimeType: format.mimeType,
      width: processed.info.width,
      height: processed.info.height,
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw new AppError(
      415,
      'FILE_CONTENT_MISMATCH',
      'That image could not be processed.',
    )
  }
}

export async function validateUploadedFile(
  file: Express.Multer.File,
  policy: UploadPolicy,
): Promise<ValidatedUpload> {
  const extension = getFileExtension(file.originalname)

  if (!isAllowedExtension(policy, extension)) {
    throw new AppError(
      415,
      'FILE_TYPE_NOT_ALLOWED',
      'That file type is not supported here.',
    )
  }

  if (file.size <= 0) {
    throw new AppError(400, 'FILE_REQUIRED', 'Choose a file to upload.')
  }

  if (file.size > maxBytesForPolicy(policy)) {
    throw new AppError(
      413,
      'FILE_TOO_LARGE',
      'That file is larger than the allowed limit.',
    )
  }

  let detected: DetectedType | undefined

  try {
    detected = await detectType(file.path)
  } catch {
    throw new AppError(
      415,
      'FILE_CONTENT_MISMATCH',
      'That file could not be read as the selected type.',
    )
  }

  assertDetectedType(extension, detected)

  const originalBuffer = await readFile(file.path)

  if (policy === 'image') {
    const processed = await processImage(
      originalBuffer,
      detected?.mime ?? extensionToImageMime(extension),
    )

    return {
      buffer: processed.buffer,
      mimeType: processed.mimeType,
      sizeBytes: processed.buffer.length,
      checksumSha256: calculateChecksum(processed.buffer),
      fileClass: 'image',
      width: processed.width,
      height: processed.height,
    }
  }

  if (isTextExtension(extension)) {
    validateTextFile(originalBuffer)
  }

  return {
    buffer: originalBuffer,
    mimeType:
      detected?.mime ??
      (extension === '.md' ? 'text/markdown' : 'text/plain'),
    sizeBytes: originalBuffer.length,
    checksumSha256: calculateChecksum(originalBuffer),
    fileClass: 'document',
    width: null,
    height: null,
  }
}

function extensionToImageMime(extension: string): string {
  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg'
  }

  if (extension === '.png') {
    return 'image/png'
  }

  return 'image/webp'
}
