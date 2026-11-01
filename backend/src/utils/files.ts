import { createHash } from 'node:crypto'
import { rm } from 'node:fs/promises'
import { basename, extname, parse } from 'node:path'
import { logger } from '../logger.js'

const MAX_BASE_LENGTH = 100
const MAX_EXTENSION_LENGTH = 10

export function sanitizeOriginalFilename(name: string): string {
  const normalized = name.replaceAll('\\', '/')
  const base = basename(normalized)
  const parsed = parse(base)
  const extension = parsed.ext
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')
    .slice(0, MAX_EXTENSION_LENGTH)
  const safeBase = parsed.name
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}._ -]+/gu, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/^[-. ]+|[-. ]+$/g, '')
    .slice(0, MAX_BASE_LENGTH)

  return `${safeBase || 'file'}${extension}`
}

export function getFileExtension(filename: string): string {
  return extname(filename).toLowerCase()
}

export function buildStoragePath(
  courseId: string,
  fileId: string,
  filename: string,
): string {
  return `courses/${courseId}/${fileId}/${filename}`
}

export function calculateChecksum(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

export async function removeTempUpload(filePath: string): Promise<void> {
  try {
    await rm(filePath, { force: true })
  } catch (error) {
    logger.warn({ err: error }, 'Temporary upload cleanup failed')
  }
}
