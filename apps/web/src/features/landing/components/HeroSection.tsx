import { Link } from '@tanstack/react-router'
import { ArrowRight, ChevronRight } from 'lucide-react'
import type { MouseEvent } from 'react'

import { Button } from '@/components/ui/button'
import { ProductMock } from '@/features/landing/components/ProductMock'
import { Reveal } from '@/features/landing/components/Reveal'

export function HeroSection() {
  // Trails a soft light behind the cursor across the hero.
  const handleMouseMove = (event: MouseEvent<HTMLElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--hero-x', `${event.clientX - rect.left}px`)
    event.currentTarget.style.setProperty('--hero-y', `${event.clientY - rect.top}px`)
  }

  return (
    <section
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-24"
    >
      {/* Backdrop: faint grid + aurora glow + cursor light */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,black_20%,transparent_75%)]" />
        <div className="landing-aurora absolute -top-32 left-1/2 h-[420px] w-[820px] rounded-full bg-foreground/6 blur-[120px]" />
        <div className="absolute top-24 left-[15%] h-56 w-56 rounded-full bg-foreground/4 blur-[100px]" />
        <div className="absolute top-40 right-[10%] h-64 w-64 rounded-full bg-foreground/4 blur-[110px]" />
        <div className="landing-hero-glow absolute inset-0" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <a
            href="#features"
            className="group inline-flex items-center gap-2.5 rounded-full border bg-background/70 py-1.5 pr-3 pl-2.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur transition-colors hover:border-foreground/25 hover:text-foreground"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/40" />
              <span className="relative inline-flex size-2 rounded-full bg-foreground" />
            </span>
            New: streaming answers with citations & memory
            <ChevronRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            One workspace to explore, understand, and{' '}
            <span className="landing-headline-shine">chat with your sources.</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-6 max-w-xl leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            SmartDocs turns PDFs, websites, YouTube videos, and notes into one intelligent
            workspace. Every answer is grounded in your sources — streamed in real time, with
            citations you can verify.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Button
              size="lg"
              asChild
              className="w-full shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-primary/35 sm:w-auto"
            >
              <Link to="/signup">
                Start for free
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <p className="mt-4 text-xs text-muted-foreground">
            Free to start · No credit card · Your documents stay yours
          </p>
        </Reveal>

        <Reveal delay={400} className="mt-14 w-full sm:mt-20">
          <ProductMock />
        </Reveal>
      </div>
    </section>
  )
}
