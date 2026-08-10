import { useEffect } from 'react'

import { CtaSection } from '@/features/landing/components/CtaSection'
import { FeaturesSection } from '@/features/landing/components/FeaturesSection'
import { HeroSection } from '@/features/landing/components/HeroSection'
import { HowItWorksSection } from '@/features/landing/components/HowItWorksSection'
import { LandingFooter } from '@/features/landing/components/LandingFooter'
import { LandingNav } from '@/features/landing/components/LandingNav'
import { SourceMarquee } from '@/features/landing/components/SourceMarquee'

export function LandingPage() {
  // Smooth anchor scrolling while the landing page is mounted only.
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.scrollBehavior
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.style.scrollBehavior = 'smooth'
    }
    return () => {
      root.style.scrollBehavior = previous
    }
  }, [])

  return (
    <div id="top" className="min-h-screen overflow-x-clip bg-background text-foreground">
      {/* Subtle film-grain texture over the whole page */}
      <div aria-hidden className="landing-noise" />
      <LandingNav />
      <main>
        <HeroSection />
        <SourceMarquee />
        <FeaturesSection />
        <HowItWorksSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  )
}
