import type { Request, Response } from 'express'

import { ApiError } from '../../utils/api-error'
import { sendCreated, sendOk } from '../../utils/api-response'
import type {
  CreateTextSourceInput,
  CreateUrlSourceInput,
  RenameSourceInput,
} from '../../validators/source.validator'
import { sourceService } from './service'
import { toSourceDetailResponse, toSourceResponse, type SourceResponse } from './types'

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

function getWorkspaceId(req: Request): string {
  const { workspaceId } = req.params
  return Array.isArray(workspaceId) ? workspaceId[0] : workspaceId
}

function getOptionalTitle(req: Request): string | undefined {
  const body = req.body as { title?: unknown } | undefined
  return typeof body?.title === 'string' && body.title.trim() ? body.title.slice(0, 200) : undefined
}

export const sourceController = {
  async list(req: Request, res: Response): Promise<void> {
    const sources = await sourceService.listByWorkspace(getWorkspaceId(req), getOwnerId(req))
    const data: SourceResponse[] = sources.map(toSourceResponse)
    sendOk(res, data)
  },

  async getById(req: Request, res: Response): Promise<void> {
    const source = await sourceService.getByIdForOwner(getParamId(req), getOwnerId(req))
    sendOk(res, toSourceDetailResponse(source))
  },

  async uploadPdf(req: Request, res: Response): Promise<void> {
    const file = req.file
    if (!file) {
      throw ApiError.badRequest('A PDF file is required (form field "file")')
    }

    const source = await sourceService.createPdfSource(
      getWorkspaceId(req),
      getOwnerId(req),
      file,
      getOptionalTitle(req),
    )
    sendCreated(res, toSourceResponse(source))
  },

  async createText(req: Request, res: Response): Promise<void> {
    const { title, content, kind } = req.body as CreateTextSourceInput
    const source = await sourceService.createTextSource(
      getWorkspaceId(req),
      getOwnerId(req),
      kind,
      title,
      content,
    )
    sendCreated(res, toSourceResponse(source))
  },

  async createWebsite(req: Request, res: Response): Promise<void> {
    const { url, title } = req.body as CreateUrlSourceInput
    const source = await sourceService.createWebsiteSource(
      getWorkspaceId(req),
      getOwnerId(req),
      url,
      title,
    )
    sendCreated(res, toSourceResponse(source))
  },

  async createYoutube(req: Request, res: Response): Promise<void> {
    const { url, title } = req.body as CreateUrlSourceInput
    const source = await sourceService.createYoutubeSource(
      getWorkspaceId(req),
      getOwnerId(req),
      url,
      title,
    )
    sendCreated(res, toSourceResponse(source))
  },

  async rename(req: Request, res: Response): Promise<void> {
    const { title } = req.body as RenameSourceInput
    const source = await sourceService.renameForOwner(getParamId(req), getOwnerId(req), title)
    sendOk(res, toSourceResponse(source))
  },

  async remove(req: Request, res: Response): Promise<void> {
    await sourceService.deleteForOwner(getParamId(req), getOwnerId(req))
    sendOk(res, { id: getParamId(req) })
  },

  async retry(req: Request, res: Response): Promise<void> {
    const source = await sourceService.retryForOwner(getParamId(req), getOwnerId(req))
    sendOk(res, toSourceResponse(source))
  },
}
