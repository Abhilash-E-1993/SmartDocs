import { useUser } from '@clerk/clerk-react'
import { FolderPlus } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { WorkspaceCard } from '@/features/workspace/components/WorkspaceCard'
import { WorkspaceFormDialog } from '@/features/workspace/components/WorkspaceFormDialog'
import { useWorkspaces } from '@/features/workspace/hooks/useWorkspaces'
import { getErrorMessage } from '@/lib/axios'
import { WorkspaceGridSkeleton } from './WorkspaceGridSkeleton'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) {
    return 'Good morning'
  }
  if (hour < 18) {
    return 'Good afternoon'
  }
  return 'Good evening'
}

const today = new Intl.DateTimeFormat('en', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
}).format(new Date())

export function DashboardView() {
  const { user } = useUser()
  const { data: workspaces, isLoading, isError, error, refetch } = useWorkspaces()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-enter space-y-1.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {today}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting()}
            {user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick up a workspace, or capture something new.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="sm:mb-0.5">
          <FolderPlus className="size-4" />
          New workspace
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            Your workspaces
            {workspaces && workspaces.length > 0 ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                {workspaces.length}
              </span>
            ) : null}
          </h2>
        </div>

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
            {workspaces.map((workspace, index) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FolderPlus}
            title="Create your first workspace"
            description="Workspaces keep your documents, chats and AI memory together. Create one and start asking questions in minutes."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <FolderPlus className="size-4" />
                New workspace
              </Button>
            }
          />
        )}
      </section>

      <WorkspaceFormDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
