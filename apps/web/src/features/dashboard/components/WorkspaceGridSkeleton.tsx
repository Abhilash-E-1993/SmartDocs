import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function WorkspaceGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="gap-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="size-8 rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  )
}
