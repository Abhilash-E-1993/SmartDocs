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

// Upload at most two PDFs at once; the rest wait in a FIFO queue. Firing every
// file at the same time saturates the browser's per-host connection limit and
// makes each individual upload slower and flakier.
const MAX_CONCURRENT_UPLOADS = 2

export function usePdfUploads(workspaceId: string) {
  const [items, setItems] = useState<PdfUploadItem[]>([])
  const controllersRef = useRef(new Map<string, AbortController>())
  const queueRef = useRef<PdfUploadItem[]>([])
  const activeCountRef = useRef(0)
  const queryClient = useQueryClient()

  const updateItem = (localId: string, patch: Partial<PdfUploadItem>): void => {
    setItems((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    )
  }

  const removeItem = (localId: string): void => {
    controllersRef.current.delete(localId)
    queueRef.current = queueRef.current.filter((item) => item.localId !== localId)
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
    } finally {
      // Release the slot and start the next queued upload, if any.
      controllersRef.current.delete(item.localId)
      activeCountRef.current = Math.max(0, activeCountRef.current - 1)
      pumpQueue()
    }
  }

  const pumpQueue = (): void => {
    while (activeCountRef.current < MAX_CONCURRENT_UPLOADS && queueRef.current.length > 0) {
      const next = queueRef.current.shift()
      if (!next) {
        break
      }
      activeCountRef.current += 1
      void runUpload(next)
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
    queueRef.current.push(...newItems)
    pumpQueue()
  }

  const cancel = (localId: string): void => {
    const controller = controllersRef.current.get(localId)
    if (controller) {
      controller.abort()
      return
    }

    // Still waiting in the queue — just drop it.
    removeItem(localId)
  }

  const retry = (localId: string): void => {
    const item = items.find((current) => current.localId === localId)
    if (!item) {
      return
    }

    updateItem(localId, { status: 'uploading', progress: 0, errorMessage: undefined })
    queueRef.current.push(item)
    pumpQueue()
  }

  return { items, start, cancel, retry, dismiss: removeItem }
}

