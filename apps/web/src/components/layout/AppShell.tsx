import { useState, type ReactNode } from 'react'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { CommandMenu } from '@/components/layout/CommandMenu'
import { TopNav } from '@/components/layout/TopNav'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'

export function AppShell({ children }: { children: ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useKeyboardShortcut({
    key: 'k',
    mod: true,
    onTrigger: () => setCommandOpen((open) => !open),
  })

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r md:block">
        <AppSidebar />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav
          onMenuClick={() => setMobileNavOpen(true)}
          onCommandClick={() => setCommandOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
