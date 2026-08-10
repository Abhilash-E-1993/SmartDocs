import { Skeleton } from '@/components/ui/skeleton'

export function WorkspaceDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-[540px] w-full rounded-xl" />
    </div>
  )
}
