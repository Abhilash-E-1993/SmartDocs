import { useNavigate, useParams } from '@tanstack/react-router'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useDeleteWorkspace } from '@/features/workspace/hooks/useDeleteWorkspace'
import type { Workspace } from '@/types/workspace'

interface DeleteWorkspaceDialogProps {
  workspace: Workspace
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteWorkspaceDialog({
  workspace,
  open,
  onOpenChange,
}: DeleteWorkspaceDialogProps) {
  const deleteMutation = useDeleteWorkspace()
  const navigate = useNavigate()
  const params = useParams({ strict: false })

  const handleConfirm = async (): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(workspace.id)
      onOpenChange(false)

      if (params.workspaceId === workspace.id) {
        void navigate({ to: '/dashboard' })
      }
    } catch {
      // The mutation's onError already surfaces a toast.
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete workspace"
      description={`This will permanently delete "${workspace.name}" and everything inside it. This action cannot be undone.`}
      confirmLabel="Delete workspace"
      loading={deleteMutation.isPending}
      onConfirm={() => void handleConfirm()}
    />
  )
}
