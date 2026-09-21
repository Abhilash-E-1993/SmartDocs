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

export const pdfService = { extractText }
