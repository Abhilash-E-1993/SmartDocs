import { cn } from '@/lib/utils'

interface WorkspaceAvatarProps {
  name: string
  className?: string
}

/**
 * Monochrome workspace tile — the same initial mark everywhere a workspace
 * appears (cards, header, switcher, command menu).
 */
export function WorkspaceAvatar({ name, className }: WorkspaceAvatarProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center bg-foreground font-semibold text-background',
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
