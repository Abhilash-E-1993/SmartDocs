export const CLERK_PUBLISHABLE_KEY: string | undefined = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export const isClerkConfigured = Boolean(
  CLERK_PUBLISHABLE_KEY &&
  CLERK_PUBLISHABLE_KEY.startsWith('pk_') &&
  !CLERK_PUBLISHABLE_KEY.includes('your_'),
)
