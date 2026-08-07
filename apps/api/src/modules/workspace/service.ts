import { ApiError } from '../../utils/api-error'
import { WorkspaceModel, type WorkspaceDocument } from './Workspace'

async function listByOwner(ownerId: string): Promise<WorkspaceDocument[]> {
  return WorkspaceModel.find({ owner: ownerId }).sort({ createdAt: -1 })
}

async function getByIdForOwner(id: string, ownerId: string): Promise<WorkspaceDocument> {
  const workspace = await WorkspaceModel.findOne({ _id: id, owner: ownerId })
  if (!workspace) {
    throw ApiError.notFound('Workspace not found')
  }

  return workspace
}

async function createForOwner(ownerId: string, name: string): Promise<WorkspaceDocument> {
  return WorkspaceModel.create({ name, owner: ownerId })
}

async function renameForOwner(
  id: string,
  ownerId: string,
  name: string,
): Promise<WorkspaceDocument> {
  const workspace = await WorkspaceModel.findOneAndUpdate(
    { _id: id, owner: ownerId },
    { name },
    { returnDocument: 'after', runValidators: true },
  )
  if (!workspace) {
    throw ApiError.notFound('Workspace not found')
  }

  return workspace
}

async function deleteForOwner(id: string, ownerId: string): Promise<void> {
  const deleted = await WorkspaceModel.findOneAndDelete({ _id: id, owner: ownerId })
  if (!deleted) {
    throw ApiError.notFound('Workspace not found')
  }
}

export const workspaceService = {
  listByOwner,
  getByIdForOwner,
  createForOwner,
  renameForOwner,
  deleteForOwner,
}
