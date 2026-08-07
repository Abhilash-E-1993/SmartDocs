import { Link } from '@tanstack/react-router'
import { BookOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteWorkspaceDialog } from '@/features/workspace/components/DeleteWorkspaceDialog'
import { WorkspaceDetailSkeleton } from '@/features/workspace/components/WorkspaceDetailSkeleton'
import { WorkspaceFormDialog } from '@/features/workspace/components/WorkspaceFormDialog'
import { useWorkspace } from '@/features/workspace/hooks/useWorkspaces'
import { getErrorMessage } from '@/lib/axios'
import { formatDate } from '@/utils/formatDate'

interface WorkspaceViewProps {
  workspaceId: string
}

export function WorkspaceView({ workspaceId }: WorkspaceViewProps) {
  const { data: workspace, isLoading, isError, error, refetch } = useWorkspace(workspaceId)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading) {
    return <WorkspaceDetailSkeleton />
  }

  if (isError || !workspace) {
    return (
      <ErrorState
        title="Workspace unavailable"
        message={getErrorMessage(error)}
        onRetry={() => void refetch()}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={workspace.name}
        description={`Created ${formatDate(workspace.createdAt)}`}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="size-4" />
                Manage
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                <Pencil className="size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <EmptyState
        icon={BookOpen}
        title="No sources yet"
        description="This workspace is ready. Document uploads, websites, YouTube videos and AI chat arrive in the next milestone."
      />

      <WorkspaceFormDialog
        mode="rename"
        workspace={workspace}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />
      <DeleteWorkspaceDialog workspace={workspace} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  )
}
