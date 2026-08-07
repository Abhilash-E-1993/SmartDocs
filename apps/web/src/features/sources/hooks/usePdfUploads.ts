import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { sourcesQueryKey } from '@/features/sources/hooks/useSources'
import { getErrorMessage } from '@/lib/axios'
import { sourceService } from '@/services/source.service'

export interface PdfUploadItem {
  localId: string
  file: File
  fileName: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  errorMessage?: string
}

export function usePdfUploads(workspaceId: string) {
  const [items, setItems] = useState<PdfUploadItem[]>([])
  const controllersRef = useRef(new Map<string, AbortController>())
  const queryClient = useQueryClient()

  const updateItem = (localId: string, patch: Partial<PdfUploadItem>): void => {
    setItems((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    )
  }

  const removeItem = (localId: string): void => {
    controllersRef.current.delete(localId)
    setItems((current) => current.filter((item) => item.localId !== localId))
  }

  const runUpload = async (item: PdfUploadItem): Promise<void> => {
    const controller = new AbortController()
    controllersRef.current.set(item.localId, controller)

    try {
      await sourceService.uploadPdf(workspaceId, item.file, undefined, {
        signal: controller.signal,
        onProgress: (progress) => updateItem(item.localId, { progress }),
      })

      updateItem(item.localId, { status: 'success', progress: 100 })
      toast.success(`"${item.fileName}" uploaded`)
      void queryClient.invalidateQueries({ queryKey: sourcesQueryKey(workspaceId) })
      setTimeout(() => removeItem(item.localId), 1500)
    } catch (error) {
      if (axios.isCancel(error)) {
        removeItem(item.localId)
        return
      }

      updateItem(item.localId, { status: 'error', errorMessage: getErrorMessage(error) })
    }
  }

  const start = (files: File[]): void => {
    const newItems = files.map((file): PdfUploadItem => ({
      localId: crypto.randomUUID(),
      file,
      fileName: file.name,
      progress: 0,
      status: 'uploading',
    }))

    setItems((current) => [...current, ...newItems])
    newItems.forEach((item) => void runUpload(item))
  }

  const cancel = (localId: string): void => {
    controllersRef.current.get(localId)?.abort()
  }

  const retry = (localId: string): void => {
    const item = items.find((current) => current.localId === localId)
    if (!item) {
      return
    }

    updateItem(localId, { status: 'uploading', progress: 0, errorMessage: undefined })
    void runUpload(item)
  }

  return { items, start, cancel, retry, dismiss: removeItem }
}
