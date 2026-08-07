import { z } from 'zod'

export const objectIdParamSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid workspace id'),
})

export const workspaceNameSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be 80 characters or fewer'),
})

export type WorkspaceNameInput = z.infer<typeof workspaceNameSchema>
