import { useAuth } from '@clerk/clerk-react'
import type { ReactNode } from 'react'

import { setAuthTokenGetter } from '@/lib/axios'

export function AuthBridge({ children }: { children: ReactNode }) {
  const { getToken } = useAuth()

  // Registers Clerk's token factory with the API client before any child query runs.
  setAuthTokenGetter(getToken)

  return <>{children}</>
}
