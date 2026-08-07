export function normalizeText(raw: string): string {
  return (
    raw
      .normalize('NFC')
      .replace(/\r\n?/g, '\n')
      // eslint-disable-next-line no-control-regex -- intentionally strips control characters from extracted text
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ {2,}/g, ' ')
      .trim()
  )
}
