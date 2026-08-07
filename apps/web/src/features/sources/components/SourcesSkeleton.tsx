import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function SourcesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </Card>
      ))}
    </div>
  )
}
