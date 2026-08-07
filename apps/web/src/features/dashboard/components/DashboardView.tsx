import { FolderPlus } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { WorkspaceCard } from '@/features/workspace/components/WorkspaceCard'
import { WorkspaceFormDialog } from '@/features/workspace/components/WorkspaceFormDialog'
import { useWorkspaces } from '@/features/workspace/hooks/useWorkspaces'
import { getErrorMessage } from '@/lib/axios'
import { WorkspaceGridSkeleton } from './WorkspaceGridSkeleton'

export function DashboardView() {
  const { data: workspaces, isLoading, isError, error, refetch } = useWorkspaces()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Your workspaces"
        description="Each workspace keeps its sources, chats and memory in one place."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <FolderPlus className="size-4" />
            New workspace
          </Button>
        }
      />

      {isLoading ? (
        <WorkspaceGridSkeleton />
      ) : isError ? (
        <ErrorState
          title="Could not load workspaces"
          message={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      ) : workspaces && workspaces.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderPlus}
          title="Create your first workspace"
          description="Workspaces are where your documents, chats and AI memory live. Start by creating one."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <FolderPlus className="size-4" />
              New workspace
            </Button>
          }
        />
      )}

      <WorkspaceFormDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
