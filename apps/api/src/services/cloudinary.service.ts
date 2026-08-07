import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary'
import { ApiError } from '../utils/api-error'

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

async function uploadPdf(buffer: Buffer, publicId: string): Promise<UploadedPdf> {
  assertConfigured()

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: 'smartdocs', public_id: publicId, format: 'pdf' },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed'))
          return
        }

        resolve({ url: result.secure_url, publicId: result.public_id, bytes: result.bytes })
      },
    )

    stream.end(buffer)
  })
}

async function downloadPdf(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download PDF (HTTP ${response.status})`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function deletePdf(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured) {
    return
  }

  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).catch(() => undefined)
}

export const cloudinaryService = { uploadPdf, downloadPdf, deletePdf }
