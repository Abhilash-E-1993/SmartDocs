import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen, Briefcase, Code, GraduationCap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Reveal } from '@/features/landing/components/Reveal'

const AUDIENCES = [
  { icon: GraduationCap, label: 'Students' },
  { icon: Code, label: 'Developers' },
  { icon: BookOpen, label: 'Researchers' },
  { icon: Briefcase, label: 'Professionals' },
] as const

export function CtaSection() {
  return (
    <section id="get-started" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="landing-beam relative overflow-hidden rounded-2xl border bg-card px-6 py-16 text-center sm:px-16 sm:py-20">
            {/* Glow + grid backdrop */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 left-1/2 h-64 w-[480px] -translate-x-1/2 rounded-full bg-foreground/6 blur-[100px]" />
              <div className="absolute inset-0 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,black,transparent_80%)]" />
            </div>

            <div className="relative flex flex-col items-center">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {AUDIENCES.map((audience) => (
                  <span
                    key={audience.label}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground"
                  >
                    <audience.icon className="size-3" />
                    {audience.label}
                  </span>
                ))}
              </div>

              <h2 className="mt-6 max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Your second brain is one upload away
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Create a workspace, add your first source, and ask your first question — all in
                under two minutes.
              </p>

              <div className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
                <Button
                  size="lg"
                  asChild
                  className="w-full shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-primary/35 sm:w-auto"
                >
                  <Link to="/signup">
                    Get started free
                    <ArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" asChild className="w-full sm:w-auto">
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
