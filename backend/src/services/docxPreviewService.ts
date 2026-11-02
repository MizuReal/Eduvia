import mammoth from 'mammoth'
import sanitizeHtml from 'sanitize-html'
import yauzl from 'yauzl'
import {
  DOCX_CONVERSION_TIMEOUT_MS,
  MAX_DOCX_ENTRIES,
  MAX_DOCX_UNCOMPRESSED_BYTES,
  QUIZ_PREVIEW_HTML_MAX_BYTES,
} from '../config/constants.js'
import { AppError } from '../errors/AppError.js'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'blockquote',
  'pre',
  'code',
  'a',
]

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AppError(422, 'DOCX_PREVIEW_TIMEOUT', message))
    }, DOCX_CONVERSION_TIMEOUT_MS)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function assertZipWithinLimits(buffer: Buffer): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false
    let entries = 0
    let totalSize = 0

    const timer = setTimeout(() => {
      finish(
        new AppError(
          422,
          'DOCX_PREVIEW_TIMEOUT',
          'That document took too long to inspect.',
        ),
      )
    }, DOCX_CONVERSION_TIMEOUT_MS)

    const finish = (error?: AppError) => {
      if (settled) {
        return
      }

      settled = true
      clearTimeout(timer)

      if (error) {
        reject(error)
        return
      }

      resolve()
    }

    yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, zipFile) => {
      if (error || !zipFile) {
        finish(
          new AppError(
            415,
            'DOCX_PREVIEW_FAILED',
            'That document could not be read.',
          ),
        )
        return
      }

      const close = () => {
        try {
          zipFile.close()
        } catch {
          // The archive is already closed.
        }
      }

      zipFile.on('entry', (entry) => {
        entries += 1
        totalSize += entry.uncompressedSize

        if (
          entries > MAX_DOCX_ENTRIES ||
          totalSize > MAX_DOCX_UNCOMPRESSED_BYTES
        ) {
          close()
          finish(
            new AppError(
              413,
              'DOCX_PREVIEW_TOO_LARGE',
              'That document is too large to preview. Use a smaller file.',
            ),
          )
          return
        }

        zipFile.readEntry()
      })

      zipFile.on('end', () => {
        close()
        finish()
      })

      zipFile.on('error', () => {
        close()
        finish(
          new AppError(
            415,
            'DOCX_PREVIEW_FAILED',
            'That document could not be read.',
          ),
        )
      })

      zipFile.readEntry()
    })
  })
}

export async function convertDocxToPreview(buffer: Buffer): Promise<string> {
  await assertZipWithinLimits(buffer)

  let result: { value: string }

  try {
    result = await withTimeout(
      mammoth.convertToHtml({ buffer }),
      'That document took too long to convert.',
    )
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw new AppError(
      422,
      'DOCX_PREVIEW_FAILED',
      'That document could not be previewed.',
    )
  }

  const sanitized = sanitizeHtml(result.value, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href'],
    disallowedTagsMode: 'discard',
  })

  if (Buffer.byteLength(sanitized) > QUIZ_PREVIEW_HTML_MAX_BYTES) {
    throw new AppError(
      413,
      'DOCX_PREVIEW_TOO_LARGE',
      'That document preview is too large. Use a smaller file.',
    )
  }

  return sanitized
}
