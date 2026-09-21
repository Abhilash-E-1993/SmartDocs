import { PDFParse } from 'pdf-parse'

interface PdfExtraction {
  text: string
  pageCount: number
}

async function extractText(buffer: Buffer): Promise<PdfExtraction> {
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF file buffer is empty')
  }

  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return { text: result.text, pageCount: result.total }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown PDF parsing error'
    if (/password/i.test(message)) {
      throw new Error('Password-protected PDF files cannot be processed', { cause: error })
    }
    throw new Error(`Failed to parse PDF document: ${message}`, { cause: error })
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}

export const pdfService = { extractText }
