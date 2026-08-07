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
import { useCreateWorkspace } from '@/features/workspace/hooks/useCreateWorkspace'
import { useRenameWorkspace } from '@/features/workspace/hooks/useRenameWorkspace'
import {
  workspaceNameFormSchema,
  type WorkspaceNameFormValues,
} from '@/features/workspace/types/workspace-form'
import type { Workspace } from '@/types/workspace'

interface CreateDialogProps {
  mode: 'create'
  workspace?: never
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface RenameDialogProps {
  mode: 'rename'
  workspace: Workspace
  open: boolean
  onOpenChange: (open: boolean) => void
}

type WorkspaceFormDialogProps = CreateDialogProps | RenameDialogProps

export function WorkspaceFormDialog(props: WorkspaceFormDialogProps) {
  const { open, onOpenChange } = props
  const initialName = props.mode === 'rename' ? props.workspace.name : ''

  const createMutation = useCreateWorkspace()
  const renameMutation = useRenameWorkspace()
  const isPending = createMutation.isPending || renameMutation.isPending

  const form = useForm<WorkspaceNameFormValues>({
    resolver: zodResolver(workspaceNameFormSchema),
    defaultValues: { name: initialName },
  })

  useEffect(() => {
    if (open) {
      form.reset({ name: initialName })
    }
  }, [open, initialName, form])

  const onSubmit = form.handleSubmit(async ({ name }) => {
    try {
      if (props.mode === 'create') {
        await createMutation.mutateAsync({ name })
      } else {
        await renameMutation.mutateAsync({ id: props.workspace.id, name })
      }

      onOpenChange(false)
    } catch {
      // The mutation's onError already surfaces a toast.
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {props.mode === 'create' ? 'Create workspace' : 'Rename workspace'}
          </DialogTitle>
          <DialogDescription>
            {props.mode === 'create'
              ? 'Workspaces keep your sources, chats and memory organized.'
              : 'Give this workspace a new name.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              placeholder="e.g. Research notes"
              autoComplete="off"
              autoFocus
              {...form.register('name')}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? 'Saving…'
                : props.mode === 'create'
                  ? 'Create workspace'
                  : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
