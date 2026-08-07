import { useNavigate } from '@tanstack/react-router'
import { FolderPlus, LayoutDashboard, MessageSquare, Sparkles } from 'lucide-react'
import { useState } from 'react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { WorkspaceFormDialog } from '@/features/workspace/components/WorkspaceFormDialog'
import { useWorkspaces } from '@/features/workspace/hooks/useWorkspaces'

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const navigate = useNavigate()
  const { data: workspaces } = useWorkspaces()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <>
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            <CommandItem
              onSelect={() => {
                onOpenChange(false)
                void navigate({ to: '/dashboard' })
              }}
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </CommandItem>
            <CommandItem
              onSelect={() => {
                onOpenChange(false)
                setCreateOpen(true)
              }}
            >
              <FolderPlus className="size-4" />
              New workspace
            </CommandItem>
          </CommandGroup>

          {workspaces && workspaces.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Workspaces">
                {workspaces.map((workspace) => (
                  <CommandItem
                    key={workspace.id}
                    onSelect={() => {
                      onOpenChange(false)
                      void navigate({
                        to: '/workspaces/$workspaceId',
                        params: { workspaceId: workspace.id },
                      })
                    }}
                  >
                    {workspace.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          <CommandSeparator />
          <CommandGroup heading="Coming soon">
            <CommandItem disabled>
              <MessageSquare className="size-4" />
              Ask your documents
            </CommandItem>
            <CommandItem disabled>
              <Sparkles className="size-4" />
              AI summaries
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <WorkspaceFormDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
