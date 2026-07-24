/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

// Interpolate {{placeholder}} tokens. Unknown tokens are left literal so admins
// notice typos immediately when previewing the email.
export function interpolate(
  text: string,
  data: Record<string, string | undefined>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? `{{${k}}}`)
}

// Very small inline parser. Supports:
//   **bold**
//   `code`
//   [label](url)
// Everything else is emitted as plain text. Kept intentionally tiny — this
// content is admin-authored, not user-authored.
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let i = 0
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIndex) {
      out.push(text.slice(lastIndex, m.index))
    }
    const k = `${keyBase}-${i++}`
    if (m[1] !== undefined) {
      out.push(React.createElement('strong', { key: k }, m[1]))
    } else if (m[2] !== undefined) {
      out.push(
        React.createElement(
          'code',
          {
            key: k,
            style: {
              fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
              backgroundColor: '#f4f4f5',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.95em',
            },
          },
          m[2],
        ),
      )
    } else if (m[3] !== undefined && m[4] !== undefined) {
      out.push(
        React.createElement(
          'a',
          {
            key: k,
            href: m[4],
            style: { color: '#0a0a0a', textDecoration: 'underline' },
          },
          m[3],
        ),
      )
    }
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex))
  return out
}

// A paragraph consisting only of a single `code` token is rendered as a
// prominent phrase box (used for the passphrase). Otherwise it's a normal
// paragraph. A paragraph consisting only of a single link is rendered as a
// button.
export type BlockKind = 'text' | 'phrase' | 'button'

export interface Block {
  kind: BlockKind
  // For 'text': raw text with inline markdown
  text?: string
  // For 'phrase': the raw code content
  phrase?: string
  // For 'button': label + href
  label?: string
  href?: string
}

export function parseBody(body: string): Block[] {
  const paragraphs = body
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return paragraphs.map<Block>((p) => {
    const codeOnly = /^`([^`]+)`$/.exec(p)
    if (codeOnly) return { kind: 'phrase', phrase: codeOnly[1] }
    const linkOnly = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p)
    if (linkOnly) return { kind: 'button', label: linkOnly[1], href: linkOnly[2] }
    return { kind: 'text', text: p }
  })
}

export function renderBlocks(body: string): React.ReactNode[] {
  const blocks = parseBody(body)
  return blocks.map((b, i) => {
    if (b.kind === 'phrase') {
      return React.createElement(
        'div',
        {
          key: `b-${i}`,
          style: {
            backgroundColor: '#f4f4f5',
            border: '2px solid #0a0a0a',
            padding: '18px 20px',
            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '0.02em',
            textAlign: 'center',
            margin: '8px 0 24px',
            wordBreak: 'break-all',
          },
        },
        b.phrase,
      )
    }
    if (b.kind === 'button') {
      return React.createElement(
        'a',
        {
          key: `b-${i}`,
          href: b.href,
          style: {
            display: 'inline-block',
            backgroundColor: '#0a0a0a',
            color: '#ffffff',
            padding: '14px 28px',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            margin: '24px 0',
          },
        },
        b.label,
      )
    }
    return React.createElement(
      'p',
      {
        key: `b-${i}`,
        style: {
          fontSize: '16px',
          lineHeight: 1.5,
          margin: '0 0 16px',
          color: '#0a0a0a',
          wordBreak: 'break-word',
        },
      },
      ...renderInline(b.text ?? '', `b-${i}`),
    )
  })
}
