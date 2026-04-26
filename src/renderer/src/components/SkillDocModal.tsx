import { useState, useEffect } from 'react'
import { X, BookOpen, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { client, Skill } from '../lib/gstack-client'

interface Props {
  skill: Skill
  onClose: () => void
}

export default function SkillDocModal({ skill, onClose }: Props) {
  const [doc, setDoc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    client.readSkillDoc(skill.id)
      .then(content => {
        setDoc(content)
        if (!content) setError('No documentation found for this skill.')
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [skill.id])

  async function copyCommand() {
    await client.copyCommand(skill.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-[page-fade-in_120ms_ease-out]"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl max-h-[80vh] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/50 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.20),0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.60),0_8px_24px_rgba(0,0,0,0.40)] flex flex-col overflow-hidden animate-[modal-enter_160ms_cubic-bezier(0.16,1,0.3,1)]">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{skill.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{skill.name}</h2>
                <code className="text-xs font-mono text-zinc-500">/{skill.id}</code>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{skill.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={copyCommand}
              title="Copy slash command"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-700/40 text-indigo-300 hover:bg-indigo-600/30 text-xs font-medium transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy command'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-zinc-500 dark:text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading documentation…</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-950/20 border border-amber-800/40">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-zinc-400">{error}</p>
            </div>
          )}

          {!loading && doc && (
            <div className="prose-skill">
              <MarkdownView content={doc} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-600">
          <BookOpen size={11} />
          <span>SKILL.md · {skill.phase} phase</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Minimal markdown renderer — handles headings, bold, inline-code, code blocks,
 * bullet lists, and horizontal rules. No external deps.
 */
function MarkdownView({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <div key={i} className="my-3">
          {lang && <p className="text-xs text-zinc-500 dark:text-zinc-600 font-mono mb-1">{lang}</p>}
          <pre className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 overflow-x-auto text-xs font-mono text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {codeLines.join('\n')}
          </pre>
        </div>
      )
      i++
      continue
    }

    // H1
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-5 mb-2 first:mt-0">{inline(line.slice(2))}</h1>)
      i++; continue
    }
    // H2
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mt-4 mb-1.5">{inline(line.slice(3))}</h2>)
      i++; continue
    }
    // H3
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mt-3 mb-1">{inline(line.slice(4))}</h3>)
      i++; continue
    }

    // HR
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-zinc-200 dark:border-zinc-800 my-4" />)
      i++; continue
    }

    // Bullet list item
    if (line.match(/^[-*+] /)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*+] /)) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={i} className="my-2 space-y-1 pl-4">
          {items.map((item, j) => (
            <li key={j} className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed list-disc list-inside">
              {inline(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Blank line
    if (line.trim() === '') {
      i++; continue
    }

    // Normal paragraph
    elements.push(<p key={i} className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed my-1.5">{inline(line)}</p>)
    i++
  }

  return <div className="space-y-0.5">{elements}</div>
}

/** Render inline markdown: **bold**, `code`, and plain text. */
function inline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  // Split on **bold** and `code`
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const m = match[0]
    if (m.startsWith('**')) {
      parts.push(<strong key={key++} className="font-semibold text-zinc-900 dark:text-zinc-100">{m.slice(2, -2)}</strong>)
    } else {
      parts.push(<code key={key++} className="font-mono text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded">{m.slice(1, -1)}</code>)
    }
    last = match.index + m.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 1 ? parts[0] : <>{parts}</>
}
