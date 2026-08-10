import { ArrowUp, FileText, MonitorPlay } from 'lucide-react'

import { useChatDemo, type DemoSegment } from '@/features/landing/hooks/useChatDemo'

const QUESTION = 'Why is my model overfitting, and how do I fix it?'

const ANSWER: DemoSegment[] = [
  {
    kind: 'text',
    text: 'Overfitting happens when your model memorizes noise instead of learning the underlying pattern. The usual causes are too many parameters for the data available, too many training epochs, and weak regularization',
  },
  { kind: 'cite', index: 1 },
  {
    kind: 'text',
    text: '. Your lecture notes recommend starting with dropout and early stopping before collecting more data',
  },
  { kind: 'cite', index: 2 },
  { kind: 'text', text: '.' },
]

const CITED_SOURCES = [
  { icon: FileText, label: 'ml-textbook.pdf', detail: 'p. 142' },
  { icon: MonitorPlay, label: 'Lecture 07 — Overfitting', detail: '12:34' },
] as const

/** Decorative, scripted chat exchange for the hero product preview. */
export function MockChatPanel() {
  const demo = useChatDemo(QUESTION, ANSWER)

  return (
    <div aria-hidden className="flex min-h-[380px] flex-col gap-4 p-4 sm:min-h-[420px] sm:p-5">
      {/* User message */}
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-xs leading-relaxed text-primary-foreground sm:text-[13px]">
          {QUESTION.slice(0, demo.questionChars)}
          {demo.isTypingQuestion ? <span className="streaming-cursor" /> : null}
        </div>
      </div>

      {/* Assistant message */}
      {demo.questionChars >= QUESTION.length ? (
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileText className="size-3" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-relaxed text-foreground sm:text-[13px]">
              {renderAnswer(ANSWER, demo.answerTicks)}
              {demo.isTypingAnswer ? <span className="streaming-cursor" /> : null}
            </p>
            {demo.isComplete ? (
              <div className="animate-enter mt-3 flex flex-wrap items-center gap-1.5">
                {CITED_SOURCES.map((source) => (
                  <span
                    key={source.label}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    <source.icon className="size-3" />
                    {source.label} · {source.detail}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Composer */}
      <div className="mt-auto flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5">
        <span className="flex-1 text-xs text-muted-foreground">Ask a follow-up…</span>
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ArrowUp className="size-3.5" />
        </span>
      </div>
    </div>
  )
}

/** Renders the answer up to `ticks` units, revealing citation badges inline. */
function renderAnswer(segments: DemoSegment[], ticks: number) {
  let consumed = 0
  return segments.map((segment, index) => {
    if (segment.kind === 'text') {
      const visible = Math.max(0, Math.min(segment.text.length, ticks - consumed))
      consumed += segment.text.length
      return <span key={index}>{segment.text.slice(0, visible)}</span>
    }
    consumed += 1
    return ticks >= consumed ? (
      <sup
        key={index}
        className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-0.5 items-center justify-center rounded-full bg-primary/10 px-1 align-middle text-[10px] font-semibold text-primary"
      >
        {segment.index}
      </sup>
    ) : null
  })
}
