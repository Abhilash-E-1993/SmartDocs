import { Link } from '@tanstack/react-router'
import { LayoutDashboard, Plus } from 'lucide-react'
import { useState } from 'react'

import { WorkspaceAvatar } from '@/components/common/WorkspaceAvatar'
import { Logo } from '@/components/layout/Logo'
import { UserMenu } from '@/components/layout/UserMenu'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { WorkspaceFormDialog } from '@/features/workspace/components/WorkspaceFormDialog'
import { WorkspaceSwitcher } from '@/features/workspace/components/WorkspaceSwitcher'
import { useWorkspaces } from '@/features/workspace/hooks/useWorkspaces'

interface AppSidebarProps {
  onNavigate?: () => void
}

const workspaceLinkClass =
  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150'

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { data: workspaces, isLoading } = useWorkspaces()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-4">
        <Link to="/dashboard" onClick={onNavigate} aria-label="SmartDocs dashboard">
          <Logo />
        </Link>
      </div>

      <div className="px-3 pb-2">
        <WorkspaceSwitcher onSwitched={onNavigate} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          activeOptions={{ exact: true }}
          className={workspaceLinkClass}
          activeProps={{
            className: 'bg-accent text-accent-foreground shadow-xs',
            'aria-current': 'page',
          }}
          inactiveProps={{
            className: 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
          }}
        >
          <LayoutDashboard className="size-4" />
          Dashboard
        </Link>

        <div className="pt-4">
          <div className="flex items-center justify-between px-3 pb-1.5">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Workspaces
            </span>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              aria-label="New workspace"
              className="flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-1 px-1 pt-0.5">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-4/5" />
            </div>
          ) : workspaces && workspaces.length > 0 ? (
            <div className="space-y-0.5">
              {workspaces.map((workspace) => (
                <Link
                  key={workspace.id}
                  to="/workspaces/$workspaceId"
                  params={{ workspaceId: workspace.id }}
                  onClick={onNavigate}
                  activeOptions={{ includeSearch: false }}
                  className={workspaceLinkClass}
                  activeProps={{
                    className: 'bg-accent text-accent-foreground shadow-xs',
                    'aria-current': 'page',
                  }}
                  inactiveProps={{
                    className: 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  }}
                >
                  <WorkspaceAvatar name={workspace.name} className="size-5 rounded text-[10px]" />
                  <span className="truncate">{workspace.name}</span>
                </Link>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex w-full items-center gap-2.5 rounded-md border border-dashed px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:border-foreground/30 hover:bg-accent/60 hover:text-foreground"
            >
              <Plus className="size-4" />
              New workspace
            </button>
          )}
        </div>
      </nav>

      <Separator />
      <div className="p-3">
        <UserMenu />
      </div>

      <WorkspaceFormDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
