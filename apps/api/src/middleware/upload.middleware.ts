import multer from 'multer'

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024

export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    const isPdf =
      file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')
    callback(null, isPdf)
  },
}).single('file')
