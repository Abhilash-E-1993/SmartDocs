import { useEffect, useMemo, useState } from 'react'

import { useReducedMotion } from '@/features/landing/hooks/useReducedMotion'

export type DemoSegment = { kind: 'text'; text: string } | { kind: 'cite'; index: number }

interface ChatDemoState {
  /** Number of question characters currently visible. */
  questionChars: number
  /** Number of answer ticks (characters + citation markers) currently visible. */
  answerTicks: number
  /** True once the full answer (including citations) has been revealed. */
  isComplete: boolean
  isTypingQuestion: boolean
  isTypingAnswer: boolean
}

/**
 * Loops a scripted chat exchange for the landing hero: the question types out,
 * the answer streams in token-style with citation markers appearing inline,
 * holds for a beat, then restarts. Renders the completed exchange immediately
 * when the user prefers reduced motion.
 */
export function useChatDemo(question: string, answer: DemoSegment[]): ChatDemoState {
  const reducedMotion = useReducedMotion()

  const totalAnswerTicks = useMemo(
    () =>
      answer.reduce((sum, segment) => sum + (segment.kind === 'text' ? segment.text.length : 1), 0),
    [answer],
  )

  const [questionChars, setQuestionChars] = useState(0)
  const [answerTicks, setAnswerTicks] = useState(0)

  useEffect(() => {
    if (reducedMotion) {
      setQuestionChars(question.length)
      setAnswerTicks(totalAnswerTicks)
      return
    }

    let timer = 0
    let typed = 0
    let streamed = 0

    const typeQuestion = (): void => {
      typed += 1
      setQuestionChars(typed)
      timer =
        typed < question.length
          ? window.setTimeout(typeQuestion, 34)
          : window.setTimeout(typeAnswer, 550)
    }

    const typeAnswer = (): void => {
      streamed += 1
      setAnswerTicks(streamed)
      timer =
        streamed < totalAnswerTicks
          ? window.setTimeout(typeAnswer, 16)
          : window.setTimeout(restart, 7000)
    }

    const restart = (): void => {
      typed = 0
      streamed = 0
      setQuestionChars(0)
      setAnswerTicks(0)
      timer = window.setTimeout(typeQuestion, 800)
    }

    timer = window.setTimeout(typeQuestion, 900)
    return () => window.clearTimeout(timer)
  }, [question, totalAnswerTicks, reducedMotion])

  return {
    questionChars,
    answerTicks,
    isComplete: answerTicks >= totalAnswerTicks,
    isTypingQuestion: questionChars < question.length,
    isTypingAnswer: questionChars >= question.length && answerTicks < totalAnswerTicks,
  }
}
