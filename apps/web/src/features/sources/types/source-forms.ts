import { z } from 'zod'

export const sourceTitleFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
})

export type SourceTitleFormValues = z.infer<typeof sourceTitleFormSchema>

export const textSourceFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(200_000, 'Content is too large'),
})

export type TextSourceFormValues = z.infer<typeof textSourceFormSchema>

export const urlSourceFormSchema = z.object({
  url: z.url('Enter a valid URL'),
  title: z.string().trim().max(200).optional(),
})

export type UrlSourceFormValues = z.infer<typeof urlSourceFormSchema>
