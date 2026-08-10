import { useParams } from '@tanstack/react-router'
import { ChevronRight, Menu, Search } from 'lucide-react'

import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkspaces } from '@/features/workspace/hooks/useWorkspaces'

interface TopNavProps {
  onMenuClick: () => void
  onCommandClick: () => void
}

export function TopNav({ onMenuClick, onCommandClick }: TopNavProps) {
  const params = useParams({ strict: false })
  const { data: workspaces, isLoading } = useWorkspaces()
  const activeWorkspace = workspaces?.find((workspace) => workspace.id === params.workspaceId)

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </Button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
        <span className={activeWorkspace ? 'text-muted-foreground' : 'font-medium'}>Dashboard</span>
        {activeWorkspace ? (
          <>
            <ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground/40" />
            <span className="truncate font-medium">{activeWorkspace.name}</span>
          </>
        ) : null}
        {params.workspaceId && isLoading && !activeWorkspace ? (
          <Skeleton className="h-4 w-24" />
        ) : null}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onCommandClick}
          className="hidden h-8 w-44 items-center gap-2 rounded-lg border bg-muted/50 px-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground sm:flex lg:w-52"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="flex-1 text-left text-[13px]">Search…</span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={onCommandClick}
          aria-label="Open command menu"
        >
          <Search className="size-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
