import { Skeleton } from '@/components/ui/skeleton'

export function WorkspaceDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}
