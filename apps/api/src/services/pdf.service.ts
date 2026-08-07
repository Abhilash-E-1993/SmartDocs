import { PDFParse } from 'pdf-parse'

interface PdfExtraction {
  text: string
  pageCount: number
}

async function extractText(buffer: Buffer): Promise<PdfExtraction> {
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return { text: result.text, pageCount: result.total }
  } finally {
    await parser.destroy()
  }
}

export const pdfService = { extractText }
