import { ArrowUp, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface ChatComposerProps {
  streaming: boolean
  onSend: (content: string) => void
  onStop?: () => void
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
}

export function ChatComposer({
  streaming,
  onSend,
  onStop,
  placeholder = 'Ask about your sources…',
  disabled = false,
  autoFocus = false,
}: ChatComposerProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (autoFocus && !disabled) {
      textareaRef.current?.focus()
    }
  }, [autoFocus, disabled])

  const canSend = value.trim().length > 0 && !streaming && !disabled

  const submit = (): void => {
    if (!canSend) {
      return
    }

    onSend(value.trim())
    setValue('')
    // Keep the keyboard focus so follow-up questions flow naturally.
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  return (
    <div className="px-1 pb-1">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-foreground/25 focus-within:border-foreground/35 focus-within:shadow-md focus-within:ring-4 focus-within:ring-foreground/5">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="max-h-40 min-h-9 resize-none border-0 bg-transparent py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
            aria-label="Message"
          />
          {streaming ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={onStop}
              aria-label="Stop generating"
              className="shrink-0 rounded-full"
            >
              <Square className="size-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon-sm"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              className={cn(
                'shrink-0 rounded-full transition-all duration-200',
                canSend && 'shadow-sm hover:opacity-90',
              )}
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          Answers are grounded in your sources · Enter to send, Shift+Enter for a new line
        </p>
      </div>
    </div>
  )
}
