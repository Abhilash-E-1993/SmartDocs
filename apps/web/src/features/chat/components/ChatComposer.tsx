import { ArrowUp, Square } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ChatComposerProps {
  streaming: boolean
  onSend: (content: string) => void
  onStop: () => void
  placeholder?: string
}

export function ChatComposer({
  streaming,
  onSend,
  onStop,
  placeholder = 'Ask about your sources…',
}: ChatComposerProps) {
  const [value, setValue] = useState('')

  const canSend = value.trim().length > 0 && !streaming

  const submit = (): void => {
    if (!canSend) {
      return
    }

    onSend(value.trim())
    setValue('')
  }

  return (
    <div className="px-1 pb-1">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm transition-colors focus-within:border-ring">
          <Textarea
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
              className="shrink-0 rounded-full"
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
