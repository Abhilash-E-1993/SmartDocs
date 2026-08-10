import { Brain, CheckCircle2, Lock } from 'lucide-react'
import { useRef, type MouseEvent } from 'react'

import { MockChatPanel } from '@/features/landing/components/MockChatPanel'
import { MockSourcesPanel } from '@/features/landing/components/MockSourcesPanel'
import { useReducedMotion } from '@/features/landing/hooks/useReducedMotion'

/**
 * A decorative, stylized preview of the SmartDocs workspace for the hero.
 * The chat exchange is scripted and loops automatically; the window tilts
 * gently towards the cursor while accent cards float on a deeper Z plane.
 */
export function ProductMock() {
  const tiltRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>): void => {
    if (reducedMotion) return
    const element = tiltRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    element.style.transform = `perspective(1200px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg)`
  }

  const handleMouseLeave = (): void => {
    const element = tiltRef.current
    if (element) {
      element.style.transform = ''
    }
  }

  return (
    <div className="relative" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {/* Halo behind the window */}
      <div
        aria-hidden
        className="absolute -inset-x-8 -top-8 bottom-0 rounded-[2rem] bg-gradient-to-b from-foreground/8 via-transparent to-transparent blur-2xl"
      />

      <div
        ref={tiltRef}
        className="transition-transform duration-200 ease-out will-change-transform [transform-style:preserve-3d]"
      >
        <div className="landing-beam relative overflow-hidden rounded-xl border bg-card text-left shadow-2xl shadow-foreground/5">
          {/* Window chrome */}
          <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
            </div>
            <div className="mx-auto flex items-center gap-1.5 rounded-md border bg-background/70 px-3 py-1 text-[11px] text-muted-foreground">
              <Lock className="size-3" />
              smartdocs.app/workspaces/ml-notes
            </div>
            <div className="w-10" />
          </div>

          {/* Workspace preview */}
          <div className="grid sm:grid-cols-[220px_1fr]">
            <MockSourcesPanel className="hidden border-r sm:block" />
            <MockChatPanel />
          </div>
        </div>

        {/* Floating accents — lifted on the Z axis for parallax depth */}
        <div
          aria-hidden
          className="absolute -top-6 -right-4 hidden [transform:translateZ(60px)] lg:block"
        >
          <div className="landing-float flex items-center gap-3 rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur">
            <span className="flex size-8 items-center justify-center rounded-md bg-muted text-foreground">
              <Brain className="size-4" />
            </span>
            <span>
              <span className="block text-xs font-medium">Memory updated</span>
              <span className="block text-[11px] text-muted-foreground">
                Prefers concise summaries
              </span>
            </span>
          </div>
        </div>
        <div
          aria-hidden
          className="absolute -bottom-6 -left-4 hidden [transform:translateZ(40px)] lg:block"
        >
          <div className="landing-float-delayed flex items-center gap-3 rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur">
            <span className="flex size-8 items-center justify-center rounded-md bg-muted text-foreground">
              <CheckCircle2 className="size-4" />
            </span>
            <span>
              <span className="block text-xs font-medium">Source ready</span>
              <span className="block text-[11px] text-muted-foreground">
                ml-textbook.pdf · 214 pages
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
