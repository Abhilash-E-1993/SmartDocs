import { Link } from '@tanstack/react-router'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteWorkspaceDialog } from '@/features/workspace/components/DeleteWorkspaceDialog'
import { WorkspaceFormDialog } from '@/features/workspace/components/WorkspaceFormDialog'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types/workspace'
import { formatDate } from '@/utils/formatDate'

interface WorkspaceCardProps {
  workspace: Workspace
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isOptimistic = workspace.id.startsWith('optimistic-')

  return (
    <>
      <Card
        className={cn(
          'group relative transition-all hover:border-foreground/20 hover:shadow-sm',
          isOptimistic && 'pointer-events-none opacity-60',
        )}
      >
        <Link
          to="/workspaces/$workspaceId"
          params={{ workspaceId: workspace.id }}
          className="absolute inset-0 z-0 rounded-xl"
          aria-label={workspace.name}
        />
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-muted text-sm font-semibold">
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative z-10 size-8 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
                  aria-label="Workspace actions"
                >
                  <MoreHorizontal className="size-4" />
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
          </div>
          <CardTitle className="text-base">{workspace.name}</CardTitle>
          <CardDescription>Created {formatDate(workspace.createdAt)}</CardDescription>
        </CardHeader>
      </Card>

      {isOptimistic ? null : (
        <>
          <WorkspaceFormDialog
            mode="rename"
            workspace={workspace}
            open={renameOpen}
            onOpenChange={setRenameOpen}
          />
          <DeleteWorkspaceDialog
            workspace={workspace}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      )}
    </>
  )
}
