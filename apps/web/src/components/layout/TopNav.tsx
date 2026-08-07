import { useParams } from '@tanstack/react-router'
import { Menu, Search } from 'lucide-react'

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

      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className={activeWorkspace ? 'text-muted-foreground' : 'font-medium'}>Dashboard</span>
        {activeWorkspace ? (
          <>
            <span className="text-muted-foreground/60">/</span>
            <span className="truncate font-medium">{activeWorkspace.name}</span>
          </>
        ) : null}
        {params.workspaceId && isLoading && !activeWorkspace ? (
          <Skeleton className="h-4 w-24" />
        ) : null}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="hidden text-muted-foreground sm:inline-flex"
          onClick={onCommandClick}
        >
          <Search className="size-3.5" />
          <span>Search</span>
          <kbd className="pointer-events-none ml-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
            ⌘K
          </kbd>
        </Button>
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
