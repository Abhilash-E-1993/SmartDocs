import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceView } from '@/features/workspace/components/WorkspaceView'

export const Route = createFileRoute('/_app/workspaces/$workspaceId')({
  component: WorkspacePage,
})

function WorkspacePage() {
  const { workspaceId } = Route.useParams()
  return <WorkspaceView workspaceId={workspaceId} />
}
