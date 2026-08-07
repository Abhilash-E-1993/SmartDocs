import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceView } from '@/features/workspace/components/WorkspaceView'

interface WorkspaceSearch {
  tab?: 'sources' | 'chat'
  chat?: string
}

export const Route = createFileRoute('/_app/workspaces/$workspaceId')({
  validateSearch: (search: Record<string, unknown>): WorkspaceSearch => ({
    tab: search.tab === 'chat' ? 'chat' : search.tab === 'sources' ? 'sources' : undefined,
    chat: typeof search.chat === 'string' ? search.chat : undefined,
  }),
  component: WorkspacePage,
})

function WorkspacePage() {
  const { workspaceId } = Route.useParams()
  return <WorkspaceView workspaceId={workspaceId} />
}
