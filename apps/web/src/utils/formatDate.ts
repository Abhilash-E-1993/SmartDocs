const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate))
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()

  if (diffMs < MINUTE_MS) {
    return 'Just now'
  }

  if (diffMs < HOUR_MS) {
    const minutes = Math.floor(diffMs / MINUTE_MS)
    return `${minutes}m ago`
  }

  if (diffMs < DAY_MS) {
    const hours = Math.floor(diffMs / HOUR_MS)
    return `${hours}h ago`
  }

  if (diffMs < 7 * DAY_MS) {
    const days = Math.floor(diffMs / DAY_MS)
    return `${days}d ago`
  }

  return formatDate(isoDate)
}
