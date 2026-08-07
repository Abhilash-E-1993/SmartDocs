import { getRouteApi, Link } from '@tanstack/react-router'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatSection } from '@/features/chat/components/ChatSection'
import { DeleteWorkspaceDialog } from '@/features/workspace/components/DeleteWorkspaceDialog'
import { WorkspaceDetailSkeleton } from '@/features/workspace/components/WorkspaceDetailSkeleton'
import { WorkspaceFormDialog } from '@/features/workspace/components/WorkspaceFormDialog'
import { SourcesSection } from '@/features/sources/components/SourcesSection'
import { useWorkspace } from '@/features/workspace/hooks/useWorkspaces'
import { getErrorMessage } from '@/lib/axios'
import { formatDate } from '@/utils/formatDate'

const routeApi = getRouteApi('/_app/workspaces/$workspaceId')

type WorkspaceTab = 'sources' | 'chat'

interface WorkspaceViewProps {
  workspaceId: string
}

export function WorkspaceView({ workspaceId }: WorkspaceViewProps) {
  const { data: workspace, isLoading, isError, error, refetch } = useWorkspace(workspaceId)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  const setTab = (tab: WorkspaceTab): void => {
    void navigate({ search: (previous) => ({ ...previous, tab }), replace: true })
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
    <div className="space-y-8">
      <PageHeader
        title={workspace.name}
        description={`Created ${formatDate(workspace.createdAt)}`}
        actions={
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
        }
      />

      <Tabs
        value={search.tab ?? 'sources'}
        onValueChange={(value) => {
          if (value === 'sources' || value === 'chat') {
            setTab(value)
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>
        <TabsContent value="sources">
          <SourcesSection workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="chat" forceMount className="data-[state=inactive]:hidden">
          <ChatSection
            workspaceId={workspaceId}
            activeChatId={search.chat}
            onSelectChat={setActiveChat}
          />
        </TabsContent>
      </Tabs>

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
