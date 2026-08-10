import { getRouteApi, Link } from '@tanstack/react-router'
import { LibraryBig, MessagesSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ErrorState } from '@/components/common/ErrorState'
import { WorkspaceAvatar } from '@/components/common/WorkspaceAvatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChatSection } from '@/features/chat/components/ChatSection'
import { useChats } from '@/features/chat/hooks/useChats'
import { SourcesSection } from '@/features/sources/components/SourcesSection'
import { useSources } from '@/features/sources/hooks/useSources'
import { DeleteWorkspaceDialog } from '@/features/workspace/components/DeleteWorkspaceDialog'
import { WorkspaceDetailSkeleton } from '@/features/workspace/components/WorkspaceDetailSkeleton'
import { WorkspaceFormDialog } from '@/features/workspace/components/WorkspaceFormDialog'
import { useWorkspace } from '@/features/workspace/hooks/useWorkspaces'
import { getErrorMessage } from '@/lib/axios'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/formatDate'

const routeApi = getRouteApi('/_app/workspaces/$workspaceId')

type WorkspaceTab = 'sources' | 'chat'

interface WorkspaceViewProps {
  workspaceId: string
}

function CountChip({ count }: { count: number | undefined }) {
  if (count === undefined) {
    return null
  }
  return (
    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
      {count}
    </span>
  )
}

interface SwitchButtonProps {
  active: boolean
  icon: typeof LibraryBig
  label: string
  count: number | undefined
  onClick: () => void
}

function SwitchButton({ active, icon: Icon, label, count, onClick }: SwitchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150',
        active
          ? 'bg-background text-foreground shadow-xs'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="size-4" />
      {label}
      <CountChip count={count} />
    </button>
  )
}

export function WorkspaceView({ workspaceId }: WorkspaceViewProps) {
  const { data: workspace, isLoading, isError, error, refetch } = useWorkspace(workspaceId)
  const { data: sources } = useSources(workspaceId)
  const { data: chats } = useChats(workspaceId)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  const tab: WorkspaceTab = search.tab ?? 'sources'

  const setTab = (next: WorkspaceTab): void => {
    void navigate({ search: (previous) => ({ ...previous, tab: next }), replace: true })
  }

  const setActiveChat = (chat: string | undefined): void => {
    void navigate({ search: (previous) => ({ ...previous, chat }), replace: true })
  }

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
    <div className="space-y-4">
      <div className="animate-enter flex items-center gap-3.5">
        <WorkspaceAvatar name={workspace.name} className="size-9 rounded-lg text-sm shadow-sm" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight">{workspace.name}</h1>
          <p className="text-xs text-muted-foreground">Created {formatDate(workspace.createdAt)}</p>
        </div>
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
      </div>

      {/* Mobile view switch — desktop shows sources and chat side by side */}
      <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/50 p-1 md:hidden">
        <SwitchButton
          active={tab === 'sources'}
          icon={LibraryBig}
          label="Sources"
          count={sources?.length}
          onClick={() => setTab('sources')}
        />
        <SwitchButton
          active={tab === 'chat'}
          icon={MessagesSquare}
          label="Chat"
          count={chats?.length}
          onClick={() => setTab('chat')}
        />
      </div>

      {/* Split workspace: sources rail + chat */}
      <div className="flex h-[calc(100dvh-14.5rem)] min-h-[520px] overflow-hidden rounded-xl border bg-card shadow-md md:h-[calc(100dvh-11rem)] md:min-h-[620px]">
        <aside
          className={cn(
            'w-full flex-col bg-muted/30 md:flex md:w-72 md:shrink-0 md:border-r lg:w-80',
            tab === 'sources' ? 'flex' : 'hidden md:flex',
          )}
        >
          <SourcesSection workspaceId={workspaceId} />
        </aside>
        <div
          className={cn(
            'min-w-0 flex-1 flex-col md:flex',
            tab === 'chat' ? 'flex' : 'hidden md:flex',
          )}
        >
          <ChatSection
            workspaceId={workspaceId}
            activeChatId={search.chat}
            onSelectChat={setActiveChat}
          />
        </div>
      </div>

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
