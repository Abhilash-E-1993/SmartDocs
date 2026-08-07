import { z } from 'zod'

export const workspaceIdParamSchema = z.object({
  workspaceId: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid workspace id'),
})

export const createTextSourceSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(200_000, 'Content is too large'),
  kind: z.enum(['text', 'markdown']),
})

export type CreateTextSourceInput = z.infer<typeof createTextSourceSchema>

export const createUrlSourceSchema = z.object({
  url: z.url('Enter a valid URL').max(2048),
  title: z.string().trim().min(1).max(200).optional(),
})

export type CreateUrlSourceInput = z.infer<typeof createUrlSourceSchema>

export const renameSourceSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
})

export type RenameSourceInput = z.infer<typeof renameSourceSchema>
