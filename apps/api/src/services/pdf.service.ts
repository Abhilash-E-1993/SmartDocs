import { PDFParse } from 'pdf-parse'

interface PdfExtraction {
  text: string
  pageCount: number
}

async function extractText(buffer: Buffer): Promise<PdfExtraction> {
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF file buffer is empty')
  }

  // pdf-parse v2 requires Uint8Array — Buffer extends Uint8Array so we
  // explicitly wrap it to satisfy the TypedArray union in LoadParameters.
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const parser = new PDFParse({ data: uint8 })
  try {
    const result = await parser.getText()
    // TextResult has .text (full document string) and .total (page count)
    return { text: result.text ?? '', pageCount: result.total ?? 0 }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown PDF parsing error'
    if (/password/i.test(message) || /PasswordException/i.test(message)) {
      throw new Error('Password-protected PDF files cannot be processed', { cause: error })
    }
    throw new Error(`Failed to parse PDF document: ${message}`, { cause: error })
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}

export const pdfService = { extractText, warmup }

/**
 * Smallest valid single-page PDF — just enough to make pdf.js boot its
 * parser, worker and font machinery without any real content.
 */
const WARMUP_PDF = Buffer.from(
  '%PDF-1.4\n' +
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
    'trailer\n<< /Root 1 0 R >>\n%%EOF',
  'latin1',
)

/**
 * Initializes the pdf.js engine at server startup. Without this, the first
 * PDF uploaded after a (re)start pays the multi-second engine cold start
 * inside the user's request; later uploads reuse the warm engine.
 * Never throws — even a failed parse has already loaded the engine.
 */
async function warmup(): Promise<void> {
  await extractText(WARMUP_PDF).catch(() => undefined)
}
