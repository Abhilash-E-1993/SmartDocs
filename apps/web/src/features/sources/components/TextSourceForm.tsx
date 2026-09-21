import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateSource } from '@/features/sources/hooks/useCreateSource'
import {
  textSourceFormSchema,
  type TextSourceFormValues,
} from '@/features/sources/types/source-forms'
import { cn } from '@/lib/utils'

interface TextSourceFormProps {
  kind: 'text' | 'markdown'
  workspaceId: string
  onDone: () => void
}

export function TextSourceForm({ kind, workspaceId, onDone }: TextSourceFormProps) {
  const createSource = useCreateSource()

  const form = useForm<TextSourceFormValues>({
    resolver: zodResolver(textSourceFormSchema),
    defaultValues: { title: '', content: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createSource.mutateAsync({ kind, workspaceId, ...values })
      onDone()
    } catch {
      // The mutation's onError already surfaces a toast.
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor={`${kind}-title`}>Title</Label>
        <Input
          id={`${kind}-title`}
          placeholder={kind === 'markdown' ? 'e.g. Architecture notes' : 'e.g. Meeting notes'}
          autoComplete="off"
          {...form.register('title')}
        />
        {form.formState.errors.title ? (
          <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${kind}-content`}>Content</Label>
        <Textarea
          id={`${kind}-content`}
          placeholder={kind === 'markdown' ? '# Paste markdown here…' : 'Paste or write text here…'}
          // Use a fixed min/max height instead of field-sizing-content so the
          // textarea never overflows the dialog — users can still resize vertically.
          className={cn(
            'min-h-[140px] max-h-[320px] resize-y overflow-y-auto',
            kind === 'markdown' && 'font-mono text-xs',
          )}
          style={{ fieldSizing: 'fixed' }}
          {...form.register('content')}
        />
        {form.formState.errors.content ? (
          <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>
        ) : null}
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={createSource.isPending}>
          {createSource.isPending ? 'Adding…' : 'Add source'}
        </Button>
      </div>
    </form>
  )
}
