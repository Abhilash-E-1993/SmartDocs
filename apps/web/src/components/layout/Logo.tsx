import { FileText } from 'lucide-react'

import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  iconOnly?: boolean
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <FileText className="size-4" />
      </span>
      {iconOnly ? null : <span className="text-base font-semibold tracking-tight">SmartDocs</span>}
    </span>
  )
}
