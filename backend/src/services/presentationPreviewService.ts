import { execFile } from 'node:child_process'
import {
  access,
  copyFile,
  mkdtemp,
  readdir,
  readFile,
  rm,
} from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import sharp from 'sharp'
import {
  PDFTOPPM_BIN,
  PPTX_MIME_TYPE,
  PRESENTATION_PREVIEW_DPI,
  PRESENTATION_PREVIEW_MAX_PAGES,
  PRESENTATION_PREVIEW_MAX_WIDTH,
  PRESENTATION_PREVIEW_QUALITY,
  PRESENTATION_PREVIEW_TIMEOUT_MS,
  SOFFICE_BIN,
} from '../config/constants.js'
import { env } from '../config/env.js'
import { AppError } from '../errors/AppError.js'

const execFileAsync = promisify(execFile)
const PAGE_FILE_PATTERN = /^slide-(\d+)\.png$/
const MAX_COMMAND_BUFFER = 10 * 1024 * 1024

export type PresentationPreviewPage = {
  pageNumber: number
  buffer: Buffer
  width: number
  height: number
}

function previewError(
  code: string,
  message: string,
  statusCode = 422,
): AppError {
  return new AppError(statusCode, code, message)
}

async function convertPptxToPdf(
  sourcePath: string,
  workDir: string,
): Promise<string> {
  const profileDir = join(workDir, 'libreoffice-profile')

  try {
    await execFileAsync(
      SOFFICE_BIN,
      [
        `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
        '--headless',
        '--nologo',
        '--nofirststartwizard',
        '--convert-to',
        'pdf',
        '--outdir',
        workDir,
        sourcePath,
      ],
      {
        timeout: PRESENTATION_PREVIEW_TIMEOUT_MS,
        maxBuffer: MAX_COMMAND_BUFFER,
      },
    )
  } catch {
    throw previewError(
      'PRESENTATION_PREVIEW_FAILED',
      'We could not convert this presentation into slides. Try another PPTX or a PDF.',
    )
  }

  const pdfPath = join(workDir, 'source.pdf')

  try {
    await access(pdfPath)
  } catch {
    throw previewError(
      'PRESENTATION_PREVIEW_FAILED',
      'We could not convert this presentation into slides. Try another PPTX or a PDF.',
    )
  }

  return pdfPath
}

async function renderPdfPages(
  pdfPath: string,
  workDir: string,
): Promise<PresentationPreviewPage[]> {
  const outputPrefix = join(workDir, 'slide')

  try {
    await execFileAsync(
      PDFTOPPM_BIN,
      [
        '-png',
        '-r',
        String(PRESENTATION_PREVIEW_DPI),
        '-scale-to',
        String(PRESENTATION_PREVIEW_MAX_WIDTH),
        '-f',
        '1',
        '-l',
        String(PRESENTATION_PREVIEW_MAX_PAGES + 1),
        pdfPath,
        outputPrefix,
      ],
      {
        timeout: PRESENTATION_PREVIEW_TIMEOUT_MS,
        maxBuffer: MAX_COMMAND_BUFFER,
      },
    )
  } catch {
    throw previewError(
      'PRESENTATION_PREVIEW_FAILED',
      'We could not prepare the slide images. Try again.',
    )
  }

  const filenames = (await readdir(workDir)).filter((name) =>
    PAGE_FILE_PATTERN.test(name),
  )

  if (filenames.length === 0) {
    throw previewError(
      'PRESENTATION_PREVIEW_FAILED',
      'This presentation has no viewable slides.',
    )
  }

  if (filenames.length > PRESENTATION_PREVIEW_MAX_PAGES) {
    throw previewError(
      'PRESENTATION_TOO_MANY_SLIDES',
      `Presentations can have at most ${PRESENTATION_PREVIEW_MAX_PAGES} slides.`,
      413,
    )
  }

  const ordered = filenames
    .map((filename) => ({
      filename,
      pageNumber: Number(PAGE_FILE_PATTERN.exec(filename)?.[1] ?? 0),
    }))
    .sort((left, right) => left.pageNumber - right.pageNumber)

  const pages: PresentationPreviewPage[] = []

  for (const page of ordered) {
    const source = await readFile(join(workDir, page.filename))
    const processed = await sharp(source)
      .resize({
        width: PRESENTATION_PREVIEW_MAX_WIDTH,
        withoutEnlargement: true,
      })
      .webp({ quality: PRESENTATION_PREVIEW_QUALITY })
      .toBuffer({ resolveWithObject: true })

    pages.push({
      pageNumber: page.pageNumber,
      buffer: processed.data,
      width: processed.info.width,
      height: processed.info.height,
    })
  }

  return pages
}

export async function renderPresentationPreviews(
  file: Express.Multer.File,
  mimeType: string,
): Promise<PresentationPreviewPage[]> {
  const workDir = await mkdtemp(
    join(env.UPLOAD_TEMP_DIR, 'presentation-preview-'),
  )

  try {
    const sourcePath = join(
      workDir,
      mimeType === PPTX_MIME_TYPE ? 'source.pptx' : 'source.pdf',
    )

    await copyFile(file.path, sourcePath)

    const pdfPath =
      mimeType === PPTX_MIME_TYPE
        ? await convertPptxToPdf(sourcePath, workDir)
        : sourcePath

    return await renderPdfPages(pdfPath, workDir)
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
