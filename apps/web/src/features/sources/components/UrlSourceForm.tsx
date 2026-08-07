import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateSource } from '@/features/sources/hooks/useCreateSource'
import {
  urlSourceFormSchema,
  type UrlSourceFormValues,
} from '@/features/sources/types/source-forms'

interface UrlSourceFormProps {
  kind: 'website' | 'youtube'
  workspaceId: string
  onDone: () => void
}

export function UrlSourceForm({ kind, workspaceId, onDone }: UrlSourceFormProps) {
  const createSource = useCreateSource()

  const form = useForm<UrlSourceFormValues>({
    resolver: zodResolver(urlSourceFormSchema),
    defaultValues: { url: '', title: '' },
  })

  const onSubmit = form.handleSubmit(async ({ url, title }) => {
    try {
      await createSource.mutateAsync({
        kind,
        workspaceId,
        url,
        title: title?.trim() ? title.trim() : undefined,
      })
      onDone()
    } catch {
      // The mutation's onError already surfaces a toast.
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${kind}-url`}>{kind === 'website' ? 'Website URL' : 'YouTube URL'}</Label>
        <Input
          id={`${kind}-url`}
          type="url"
          placeholder={
            kind === 'website' ? 'https://example.com/article' : 'https://www.youtube.com/watch?v=…'
          }
          autoComplete="off"
          autoFocus
          {...form.register('url')}
        />
        {form.formState.errors.url ? (
          <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
        ) : null}
        {kind === 'youtube' ? (
          <p className="text-xs text-muted-foreground">
            Only the transcript is imported — videos are never downloaded.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${kind}-title`}>
          Title <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id={`${kind}-title`}
          placeholder="Leave blank to use a default title"
          autoComplete="off"
          {...form.register('title')}
        />
        {form.formState.errors.title ? (
          <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={createSource.isPending}>
          {createSource.isPending ? 'Adding…' : 'Add source'}
        </Button>
      </div>
    </form>
  )
}
