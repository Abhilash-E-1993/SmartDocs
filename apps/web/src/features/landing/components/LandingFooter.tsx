import { Link } from '@tanstack/react-router'

import { Logo } from '@/components/layout/Logo'

export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Logo />
          <p className="text-xs text-muted-foreground">The AI workspace for your knowledge.</p>
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <Link to="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} SmartDocs. All rights reserved.</span>
          <span>Built with React 19, Tailwind CSS 4 & TanStack</span>
        </div>
      </div>
    </footer>
  )
}
