interface CitationBadgeProps {
  index: number
  onClick: () => void
}

export function CitationBadge({ index, onClick }: CitationBadgeProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        onClick()
      }}
      aria-label={`Open citation ${index}`}
      className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-0.5 items-center justify-center rounded-full bg-primary/10 px-1 align-middle text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20"
    >
      {index}
    </button>
  )
}
