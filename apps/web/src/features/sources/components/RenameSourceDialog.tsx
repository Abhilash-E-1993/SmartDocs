import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRenameSource } from '@/features/sources/hooks/useRenameSource'
import {
  sourceTitleFormSchema,
  type SourceTitleFormValues,
} from '@/features/sources/types/source-forms'
import type { Source } from '@/types/source'

interface RenameSourceDialogProps {
  source: Source
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RenameSourceDialog({ source, open, onOpenChange }: RenameSourceDialogProps) {
  const renameMutation = useRenameSource(source.workspaceId)

  const form = useForm<SourceTitleFormValues>({
    resolver: zodResolver(sourceTitleFormSchema),
    defaultValues: { title: source.title },
  })

  useEffect(() => {
    if (open) {
      form.reset({ title: source.title })
    }
  }, [open, source.title, form])

  const onSubmit = form.handleSubmit(async ({ title }) => {
    try {
      await renameMutation.mutateAsync({ id: source.id, title })
      onOpenChange(false)
    } catch {
      // The mutation's onError already surfaces a toast.
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename source</DialogTitle>
          <DialogDescription>Give this source a new title.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source-title">Title</Label>
            <Input id="source-title" autoComplete="off" autoFocus {...form.register('title')} />
            {form.formState.errors.title ? (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={renameMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={renameMutation.isPending}>
              {renameMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
