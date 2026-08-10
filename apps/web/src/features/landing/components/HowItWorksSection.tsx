import { MessagesSquare, ScanSearch, Upload } from 'lucide-react'

import { Reveal } from '@/features/landing/components/Reveal'
import { SectionHeading } from '@/features/landing/components/SectionHeading'

const STEPS = [
  {
    icon: Upload,
    step: '01',
    title: 'Add your sources',
    description:
      'Drag & drop PDFs, paste a website or YouTube link, or drop in raw text and markdown.',
  },
  {
    icon: ScanSearch,
    step: '02',
    title: 'SmartDocs reads everything',
    description:
      'A background pipeline extracts, chunks, and indexes your content — watch it turn Ready in real time.',
  },
  {
    icon: MessagesSquare,
    step: '03',
    title: 'Ask anything',
    description:
      'Chat with your knowledge: streaming answers, inline citations, and follow-ups that remember context.',
  },
] as const

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="From pile of documents to answers in minutes"
            description="Three steps. No setup, no prompt engineering, no manual note-taking."
          />
        </Reveal>

        <div className="relative mt-14 grid gap-4 md:grid-cols-3">
          {/* Connecting line */}
          <div
            aria-hidden
            className="absolute top-6 right-[16%] left-[16%] hidden border-t border-dashed md:block"
          />
          {STEPS.map((step, index) => (
            <Reveal key={step.step} delay={index * 100}>
              <div className="relative flex h-full flex-col rounded-xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/5">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-lg border bg-background shadow-xs">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{step.step}</span>
                </div>
                <h3 className="mt-5 font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
