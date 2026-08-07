export function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Assistant is typing">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </span>
  )
}
