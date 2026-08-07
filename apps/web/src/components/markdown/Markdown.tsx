import { Children, useMemo, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { CodeBlock } from '@/components/markdown/CodeBlock'
import { CitationBadge } from '@/features/citations/components/CitationBadge'
import type { ChatCitation } from '@/types/chat'

interface MarkdownProps {
  content: string
  citations?: ChatCitation[]
  onCitationClick?: (citation: ChatCitation) => void
}

const CITATION_SPLIT_PATTERN = /(\[\d{1,2}\])/g
const CITATION_MATCH_PATTERN = /^\[(\d{1,2})\]$/

function linkifyText(
  text: string,
  citations: ChatCitation[],
  onCitationClick: (citation: ChatCitation) => void,
): ReactNode {
  const parts = text.split(CITATION_SPLIT_PATTERN)
  if (parts.length === 1) {
    return text
  }

  return parts.map((part, index) => {
    const match = CITATION_MATCH_PATTERN.exec(part)
    if (!match) {
      return part
    }

    const citationIndex = Number(match[1])
    const citation = citations[citationIndex - 1]
    if (!citation) {
      return part
    }

    return (
      <CitationBadge key={index} index={citationIndex} onClick={() => onCitationClick(citation)} />
    )
  })
}

function linkifyChildren(
  children: ReactNode,
  citations: ChatCitation[],
  onCitationClick: (citation: ChatCitation) => void,
): ReactNode {
  return Children.map(children, (child) =>
    typeof child === 'string' ? linkifyText(child, citations, onCitationClick) : child,
  )
}

function createComponents(
  citations: ChatCitation[] | undefined,
  onCitationClick: ((citation: ChatCitation) => void) | undefined,
): Components {
  const linkable = Boolean(citations?.length && onCitationClick)
  const linkify = (children: ReactNode): ReactNode =>
    linkable && citations && onCitationClick
      ? linkifyChildren(children, citations, onCitationClick)
      : children

  return {
    p: ({ children }) => <p>{linkify(children)}</p>,
    li: ({ children }) => <li>{linkify(children)}</li>,
    td: ({ children }) => <td>{linkify(children)}</td>,
    th: ({ children }) => <th>{linkify(children)}</th>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    ),
    table: ({ children }) => (
      <div className="md-table-wrapper">
        <table>{children}</table>
      </div>
    ),
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children }) => {
      const match = /language-([\w-]+)/.exec(className ?? '')
      if (match) {
        return <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />
      }

      return <code className="md-inline-code">{children}</code>
    },
  }
}

export function Markdown({ content, citations, onCitationClick }: MarkdownProps) {
  const components = useMemo(
    () => createComponents(citations, onCitationClick),
    [citations, onCitationClick],
  )

  return (
    <div className="md-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
