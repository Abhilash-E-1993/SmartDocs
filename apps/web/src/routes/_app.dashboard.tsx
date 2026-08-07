import { createFileRoute } from '@tanstack/react-router'

import { DashboardView } from '@/features/dashboard/components/DashboardView'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardView,
})
