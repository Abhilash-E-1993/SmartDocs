import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'

import { authService } from '@/services/auth.service'

export function useSyncUser() {
  const { isLoaded, isSignedIn } = useAuth()

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.getMe,
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60_000,
  })
}
