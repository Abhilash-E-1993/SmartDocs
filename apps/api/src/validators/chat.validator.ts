import { z } from 'zod'

export const chatIdParamSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid chat id'),
})

export const createChatSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
})

export type CreateChatInput = z.infer<typeof createChatSchema>

export const renameChatSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
})

export type RenameChatInput = z.infer<typeof renameChatSchema>

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message is required').max(4000, 'Message is too long'),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>

export const streamQuerySchema = z.object({
  topK: z.coerce.number().int().min(1).max(10).optional(),
})

export type StreamQueryInput = z.infer<typeof streamQuerySchema>
