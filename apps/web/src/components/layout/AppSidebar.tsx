import { Link } from '@tanstack/react-router'
import { Brain, LayoutDashboard, MessageSquare, Settings } from 'lucide-react'

import { Logo } from '@/components/layout/Logo'
import { UserMenu } from '@/components/layout/UserMenu'
import { Separator } from '@/components/ui/separator'
import { WorkspaceSwitcher } from '@/features/workspace/components/WorkspaceSwitcher'

interface AppSidebarProps {
  onNavigate?: () => void
}

const soonItems = [
  { label: 'Chats', icon: MessageSquare },
  { label: 'Memory', icon: Brain },
  { label: 'Settings', icon: Settings },
] as const

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Link to="/dashboard" onClick={onNavigate} aria-label="SmartDocs dashboard">
          <Logo />
        </Link>
      </div>

      <div className="px-3 pb-2">
        <WorkspaceSwitcher onSwitched={onNavigate} />
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          activeOptions={{ exact: true }}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          activeProps={{ className: 'bg-accent text-accent-foreground' }}
          inactiveProps={{
            className: 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
          }}
        >
          <LayoutDashboard className="size-4" />
          Dashboard
        </Link>

        {soonItems.map((item) => (
          <span
            key={item.label}
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground/50"
          >
            <span className="flex items-center gap-2">
              <item.icon className="size-4" />
              {item.label}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Soon
            </span>
          </span>
        ))}
      </nav>

      <Separator />
      <div className="p-3">
        <UserMenu />
      </div>
    </div>
  )
}
