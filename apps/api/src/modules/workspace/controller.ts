import type { Request, Response } from 'express'

import { ApiError } from '../../utils/api-error'
import { sendCreated, sendOk } from '../../utils/api-response'
import type { WorkspaceNameInput } from '../../validators/workspace.validator'
import { workspaceService } from './service'
import { toWorkspaceResponse, type WorkspaceResponse } from './types'

function getOwnerId(req: Request): string {
  const user = req.user
  if (!user) {
    throw ApiError.unauthorized()
  }

  return user._id.toString()
}

function getParamId(req: Request): string {
  const { id } = req.params
  return Array.isArray(id) ? id[0] : id
}

export const workspaceController = {
  async list(req: Request, res: Response): Promise<void> {
    const workspaces = await workspaceService.listByOwner(getOwnerId(req))
    const data: WorkspaceResponse[] = workspaces.map(toWorkspaceResponse)
    sendOk(res, data)
  },

  async getById(req: Request, res: Response): Promise<void> {
    const workspace = await workspaceService.getByIdForOwner(getParamId(req), getOwnerId(req))
    sendOk(res, toWorkspaceResponse(workspace))
  },

  async create(req: Request, res: Response): Promise<void> {
    const { name } = req.body as WorkspaceNameInput
    const workspace = await workspaceService.createForOwner(getOwnerId(req), name)
    sendCreated(res, toWorkspaceResponse(workspace))
  },

  async rename(req: Request, res: Response): Promise<void> {
    const { name } = req.body as WorkspaceNameInput
    const workspace = await workspaceService.renameForOwner(getParamId(req), getOwnerId(req), name)
    sendOk(res, toWorkspaceResponse(workspace))
  },

  async remove(req: Request, res: Response): Promise<void> {
    await workspaceService.deleteForOwner(getParamId(req), getOwnerId(req))
    sendOk(res, { id: getParamId(req) })
  },
}
