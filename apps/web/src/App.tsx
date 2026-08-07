import { ClerkProvider } from '@clerk/clerk-react'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { ConfigErrorScreen } from '@/components/common/ConfigErrorScreen'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useTheme } from '@/hooks/useTheme'
import { CLERK_PUBLISHABLE_KEY, isClerkConfigured } from '@/lib/clerk'
import { AuthBridge } from '@/providers/AuthBridge'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { router } from '@/router'

export default function App() {
  if (!isClerkConfigured || !CLERK_PUBLISHABLE_KEY) {
    return (
      <ThemeProvider>
        <ConfigErrorScreen />
      </ThemeProvider>
    )
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/login">
      <ThemeProvider>
        <QueryProvider>
          <AuthBridge>
            <TooltipProvider>
              <RouterProvider router={router} />
            </TooltipProvider>
          </AuthBridge>
          <AppToaster />
        </QueryProvider>
      </ThemeProvider>
    </ClerkProvider>
  )
}

function AppToaster() {
  const { resolvedTheme } = useTheme()

  return <Toaster theme={resolvedTheme} position="top-right" closeButton />
}
