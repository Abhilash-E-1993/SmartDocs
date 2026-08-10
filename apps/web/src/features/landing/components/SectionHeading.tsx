interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: string
}

/** Centered eyebrow + title + lede shared by the landing page sections. */
export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
      <span className="rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
        {eyebrow}
      </span>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {description ? (
        <p className="leading-relaxed text-pretty text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
