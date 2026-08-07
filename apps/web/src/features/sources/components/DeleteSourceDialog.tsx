import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useDeleteSource } from '@/features/sources/hooks/useDeleteSource'
import type { Source } from '@/types/source'

interface DeleteSourceDialogProps {
  source: Source
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteSourceDialog({
  source,
  open,
  onOpenChange,
  onDeleted,
}: DeleteSourceDialogProps) {
  const deleteMutation = useDeleteSource(source.workspaceId)

  const handleConfirm = async (): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(source.id)
      onOpenChange(false)
      onDeleted?.()
    } catch {
      // The mutation's onError already surfaces a toast.
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete source"
      description={`This will permanently delete "${source.title}" and its processed content. This action cannot be undone.`}
      confirmLabel="Delete source"
      loading={deleteMutation.isPending}
      onConfirm={() => void handleConfirm()}
    />
  )
}
