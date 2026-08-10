import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Clock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState, type CSSProperties } from 'react'

import { WorkspaceAvatar } from '@/components/common/WorkspaceAvatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  style?: CSSProperties
}

export function WorkspaceCard({ workspace, style }: WorkspaceCardProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isOptimistic = workspace.id.startsWith('optimistic-')

  return (
    <>
      <Card
        style={style}
        className={cn(
          'group animate-enter relative gap-4 p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md',
          isOptimistic && 'pointer-events-none opacity-60',
        )}
      >
        <Link
          to="/workspaces/$workspaceId"
          params={{ workspaceId: workspace.id }}
          className="absolute inset-0 z-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
          aria-label={workspace.name}
        />

        <div className="flex items-start justify-between gap-2">
          <WorkspaceAvatar name={workspace.name} className="size-10 rounded-xl text-sm shadow-sm" />
          <div className="flex items-center gap-0.5">
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative z-10 size-8 transition-opacity focus-visible:opacity-100 data-[state=open]:opacity-100 md:opacity-0 md:group-hover:opacity-100"
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
        </div>

        <div className="space-y-1">
          <p className="truncate text-[15px] font-semibold tracking-tight">{workspace.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" />
            Created {formatDate(workspace.createdAt)}
          </p>
        </div>
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
