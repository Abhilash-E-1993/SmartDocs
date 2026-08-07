import { api } from '@/lib/axios'
import type { ApiSuccess } from '@/types/api'
import type { Workspace, WorkspaceNameInput } from '@/types/workspace'

export const workspaceService = {
  async list(): Promise<Workspace[]> {
    const { data } = await api.get<ApiSuccess<Workspace[]>>('/workspaces')
    return data.data
  },

  async getById(id: string): Promise<Workspace> {
    const { data } = await api.get<ApiSuccess<Workspace>>(`/workspaces/${id}`)
    return data.data
  },

  async create(input: WorkspaceNameInput): Promise<Workspace> {
    const { data } = await api.post<ApiSuccess<Workspace>>('/workspaces', input)
    return data.data
  },

  async rename(id: string, input: WorkspaceNameInput): Promise<Workspace> {
    const { data } = await api.patch<ApiSuccess<Workspace>>(`/workspaces/${id}`, input)
    return data.data
  },

  async remove(id: string): Promise<string> {
    await api.delete<ApiSuccess<{ id: string }>>(`/workspaces/${id}`)
    return id
  },
}
