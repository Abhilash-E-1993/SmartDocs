import { createRootRoute, Outlet } from '@tanstack/react-router'

import { NotFoundView } from '@/components/common/NotFoundView'
import { RouteErrorView } from '@/components/common/RouteErrorView'

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RouteErrorView,
  notFoundComponent: NotFoundView,
})

function RootComponent() {
  return <Outlet />
}
