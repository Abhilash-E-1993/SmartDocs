import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary'
import { logger } from '../config/logger'
import { ApiError } from '../utils/api-error'
import { withRetry } from '../utils/retry'

interface UploadedPdf {
  url: string
  publicId: string
  bytes: number
}

function assertConfigured(): void {
  if (!isCloudinaryConfigured) {
    throw ApiError.serviceUnavailable('File storage is not configured')
  }
}

function toStorageError(error: unknown): ApiError {
  logger.error({ err: error }, 'Cloudinary PDF upload failed')
  const detail = error instanceof Error ? error.message : 'unknown error'
  return new ApiError(502, 'STORAGE_ERROR', `File storage rejected the upload: ${detail}`)
}

async function uploadPdf(buffer: Buffer, publicId: string): Promise<UploadedPdf> {
  assertConfigured()

  return withRetry(
    () =>
      new Promise<UploadedPdf>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'raw', folder: 'smartdocs', public_id: publicId, format: 'pdf' },
          (error, result) => {
            if (error || !result) {
              reject(toStorageError(error ?? new Error('Cloudinary upload failed')))
              return
            }

            resolve({ url: result.secure_url, publicId: result.public_id, bytes: result.bytes })
          },
        )

        stream.end(buffer)
      }),
    { attempts: 3, label: 'cloudinary-upload' },
  )
}

function httpError(message: string, status: number): Error {
  // Tagging the status lets withRetry tell transient (429/5xx) failures apart
  // from permanent ones (401/403) — only the transient ones are retried.
  return Object.assign(new Error(message), { status })
}

async function downloadPdf(url: string): Promise<Buffer> {
  return withRetry(
    async () => {
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Free Cloudinary accounts block public delivery of raw files (PDFs)
          // until this setting is enabled — signed URLs do not bypass it. This
          // error has no status tag, so it is never retried (fails fast).
          throw new Error(
            'Cloudinary blocked the PDF download. Enable "PDF and ZIP files delivery" under ' +
              'Settings > Security in the Cloudinary dashboard, then retry this source',
          )
        }
        throw httpError(`Failed to download PDF (HTTP ${response.status})`, response.status)
      }

      return Buffer.from(await response.arrayBuffer())
    },
    { attempts: 3, label: 'cloudinary-download' },
  )
}

async function deletePdf(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured) {
    return
  }

  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).catch(() => undefined)
}

export const cloudinaryService = { uploadPdf, downloadPdf, deletePdf }
