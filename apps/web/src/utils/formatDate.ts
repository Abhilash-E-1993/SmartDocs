const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate))
}
