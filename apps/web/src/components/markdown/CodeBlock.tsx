import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createHighlighter } from 'shiki'

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>

const PRELOADED_LANGUAGES = [
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'json',
  'bash',
  'shell',
  'python',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'sql',
  'yaml',
  'html',
  'css',
  'xml',
  'markdown',
]

let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: PRELOADED_LANGUAGES,
  })
  return highlighterPromise
}

interface CodeBlockProps {
  language: string
  code: string
}

export function CodeBlock({ language, code }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    getHighlighter()
      .then((highlighter) => {
        if (cancelled) {
          return
        }

        const languageId = highlighter.getLoadedLanguages().includes(language) ? language : 'text'
        setHtml(
          highlighter.codeToHtml(code, {
            lang: languageId,
            themes: { light: 'github-light', dark: 'github-dark' },
            defaultColor: false,
          }),
        )
      })
      .catch(() => {
        if (!cancelled) {
          setHtml(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [language, code])

  useEffect(() => {
    return () => {
      if (copyTimer.current) {
        clearTimeout(copyTimer.current)
      }
    }
  }, [])

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      copyTimer.current = setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="md-codeblock">
      <div className="md-codeblock-header">
        <span>{language}</span>
        <button type="button" className="md-codeblock-copy" onClick={() => void handleCopy()}>
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {html ? (
        <div className="md-codeblock-body" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="md-codeblock-body">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}
