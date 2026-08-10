import { Brain, FolderOpen, Layers, Quote, Workflow, Zap, type LucideIcon } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'

import { Reveal } from '@/features/landing/components/Reveal'
import { SectionHeading } from '@/features/landing/components/SectionHeading'
import { cn } from '@/lib/utils'

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Features"
            title="Built for understanding, not just answers"
            description="Every feature is designed to keep you in flow — and every claim accountable to your sources."
          />
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Reveal className="md:col-span-2">
            <FeatureCard
              icon={Quote}
              title="Grounded by design"
              description="Answers are retrieved from your documents, never invented. Inline citations link every claim back to the exact passage it came from."
            >
              <div className="mt-5 rounded-lg border bg-muted/40 p-3.5 text-xs leading-relaxed text-muted-foreground">
                “Regularization penalizes large weights, discouraging the model from fitting noise”
                <MockCite index={1} /> — and dropout silently disables a fraction of neurons each
                pass
                <MockCite index={2} />.
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full border bg-background px-2 py-0.5 text-[10px]">
                    ml-textbook.pdf · p. 88
                  </span>
                  <span className="rounded-full border bg-background px-2 py-0.5 text-[10px]">
                    reading-notes.md
                  </span>
                </div>
              </div>
            </FeatureCard>
          </Reveal>

          <Reveal className="md:col-span-2" delay={80}>
            <FeatureCard
              icon={Zap}
              title="Answers that stream like thought"
              description="First tokens land in milliseconds and flow in real time — with markdown, syntax highlighting, and a typing indicator that keeps you oriented."
            >
              <div className="mt-5 space-y-2.5 rounded-lg border bg-muted/40 p-3.5">
                <div className="h-2 w-3/4 rounded-full bg-foreground/10" />
                <div className="h-2 w-full rounded-full bg-foreground/10" />
                <div className="flex items-center">
                  <div className="h-2 w-1/2 rounded-full bg-foreground/10" />
                  <span className="streaming-cursor" />
                </div>
              </div>
            </FeatureCard>
          </Reveal>

          <Reveal delay={0}>
            <FeatureCard
              icon={Layers}
              title="Every kind of source"
              description="Drag in PDFs, paste text or markdown, import websites and YouTube transcripts — all in one place."
            />
          </Reveal>
          <Reveal delay={80}>
            <FeatureCard
              icon={Workflow}
              title="Hands-free indexing"
              description="Sources extract, chunk, and index in the background with live status. Failures retry in one click."
            />
          </Reveal>
          <Reveal delay={160}>
            <FeatureCard
              icon={Brain}
              title="Memory that adapts"
              description="SmartDocs remembers your preferences and context, so answers get sharper and more personal over time."
            />
          </Reveal>
          <Reveal delay={240}>
            <FeatureCard
              icon={FolderOpen}
              title="Organized workspaces"
              description="Give every project, course, or research topic its own focused space with its own sources and chats."
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
  className?: string
}

function FeatureCard({ icon: Icon, title, description, children, className }: FeatureCardProps) {
  // Moves the spotlight glow with the cursor across the card.
  const handleMouseMove = (event: MouseEvent<HTMLDivElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--spotlight-x', `${event.clientX - rect.left}px`)
    event.currentTarget.style.setProperty('--spotlight-y', `${event.clientY - rect.top}px`)
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className={cn(
        'landing-spotlight group flex h-full flex-col rounded-xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/5',
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-md border bg-muted transition-colors duration-300 group-hover:bg-accent">
        <Icon className="size-4" />
      </span>
      <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {children}
    </div>
  )
}

function MockCite({ index }: { index: number }) {
  return (
    <sup className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-0.5 items-center justify-center rounded-full bg-primary/10 px-1 align-middle text-[10px] font-semibold text-primary">
      {index}
    </sup>
  )
}
