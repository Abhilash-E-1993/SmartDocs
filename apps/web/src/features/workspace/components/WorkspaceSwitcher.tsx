import { useNavigate, useParams } from '@tanstack/react-router'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WorkspaceAvatar } from '@/components/common/WorkspaceAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import { WorkspaceFormDialog } from '@/features/workspace/components/WorkspaceFormDialog'
import { useWorkspaces } from '@/features/workspace/hooks/useWorkspaces'

interface WorkspaceSwitcherProps {
  onSwitched?: () => void
}

export function WorkspaceSwitcher({ onSwitched }: WorkspaceSwitcherProps) {
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const { data: workspaces, isLoading } = useWorkspaces()
  const [createOpen, setCreateOpen] = useState(false)

  const activeWorkspace = workspaces?.find((workspace) => workspace.id === params.workspaceId)

  const openWorkspace = (workspaceId: string): void => {
    void navigate({ to: '/workspaces/$workspaceId', params: { workspaceId } })
    onSwitched?.()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-start gap-2">
            {isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <>
                {activeWorkspace ? (
                  <WorkspaceAvatar
                    name={activeWorkspace.name}
                    className="size-5 rounded text-[10px]"
                  />
                ) : null}
                <span className="truncate">{activeWorkspace?.name ?? 'Select workspace'}</span>
              </>
            )}
            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces?.map((workspace) => (
            <DropdownMenuItem key={workspace.id} onSelect={() => openWorkspace(workspace.id)}>
              <WorkspaceAvatar name={workspace.name} className="size-5 rounded text-[10px]" />
              <span className="flex-1 truncate">{workspace.name}</span>
              {workspace.id === params.workspaceId ? (
                <Check className="size-4 text-foreground" />
              ) : null}
            </DropdownMenuItem>
          ))}
          {workspaces?.length === 0 ? (
            <DropdownMenuItem disabled>No workspaces yet</DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WorkspaceFormDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
