import { api } from '@/lib/axios'
import type { ApiSuccess } from '@/types/api'
import type { Source, SourceDetail } from '@/types/source'

export interface UploadPdfOptions {
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

export interface CreateTextSourceInput {
  title: string
  content: string
  kind: 'text' | 'markdown'
}

export interface CreateUrlSourceInput {
  url: string
  title?: string
}

export const sourceService = {
  async list(workspaceId: string): Promise<Source[]> {
    const { data } = await api.get<ApiSuccess<Source[]>>(`/workspaces/${workspaceId}/sources`)
    return data.data
  },

  async getById(id: string): Promise<SourceDetail> {
    const { data } = await api.get<ApiSuccess<SourceDetail>>(`/sources/${id}`)
    return data.data
  },

  async uploadPdf(
    workspaceId: string,
    file: File,
    title: string | undefined,
    options?: UploadPdfOptions,
  ): Promise<Source> {
    const formData = new FormData()
    formData.append('file', file)
    if (title) {
      formData.append('title', title)
    }

    const { data } = await api.post<ApiSuccess<Source>>(
      `/workspaces/${workspaceId}/sources/pdf`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: options?.signal,
        onUploadProgress: (event) => {
          const progress = event.total ? Math.round((event.loaded / event.total) * 100) : 0
          options?.onProgress?.(progress)
        },
      },
    )
    return data.data
  },

  async createText(workspaceId: string, input: CreateTextSourceInput): Promise<Source> {
    const { data } = await api.post<ApiSuccess<Source>>(
      `/workspaces/${workspaceId}/sources/text`,
      input,
    )
    return data.data
  },

  async createWebsite(workspaceId: string, input: CreateUrlSourceInput): Promise<Source> {
    const { data } = await api.post<ApiSuccess<Source>>(
      `/workspaces/${workspaceId}/sources/website`,
      input,
    )
    return data.data
  },

  async createYoutube(workspaceId: string, input: CreateUrlSourceInput): Promise<Source> {
    const { data } = await api.post<ApiSuccess<Source>>(
      `/workspaces/${workspaceId}/sources/youtube`,
      input,
    )
    return data.data
  },

  async rename(id: string, input: { title: string }): Promise<Source> {
    const { data } = await api.patch<ApiSuccess<Source>>(`/sources/${id}`, input)
    return data.data
  },

  async remove(id: string): Promise<string> {
    await api.delete<ApiSuccess<{ id: string }>>(`/sources/${id}`)
    return id
  },

  async retry(id: string): Promise<Source> {
    const { data } = await api.post<ApiSuccess<Source>>(`/sources/${id}/retry`)
    return data.data
  },
}
