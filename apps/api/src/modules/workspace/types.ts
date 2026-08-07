import type { WorkspaceDocument } from './Workspace'

export interface WorkspaceResponse {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export function toWorkspaceResponse(workspace: WorkspaceDocument): WorkspaceResponse {
  return {
    id: workspace._id.toString(),
    name: workspace.name,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  }
}
