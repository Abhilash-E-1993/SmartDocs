import { z } from 'zod'

export const workspaceNameFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be 80 characters or fewer'),
})

export type WorkspaceNameFormValues = z.infer<typeof workspaceNameFormSchema>
