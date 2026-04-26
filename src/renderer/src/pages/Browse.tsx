import { useState, useRef, useEffect } from 'react'
import {
  Send, Terminal, Trash2, Copy, Check, ChevronDown, ChevronUp,
  BookOpen, Play, Square, FileCode, Globe, MousePointer,
  Type, Camera, Link2, List, ArrowLeft, ArrowRight, RotateCw
} from 'lucide-react'
import { client } from '../lib/gstack-client'
import { useDaemon } from '../lib/store'
import { toast } from '../lib/toast'

interface LogEntry {
  id: number
  type: 'command' | 'result' | 'error'
  text: string
  time: string
}

// Task mode: common browser tasks as form inputs — no command syntax required
const TASK_PRESETS = [
  {
    id: 'goto',
    label: 'Go to a website',
    icon: Globe,
    description: 'Open a URL in the AI browser',
    fields: [{ key: 'url', label: 'Website address (URL)', placeholder: 'https://example.com', type: 'text' }],
    buildCommand: (vals: Record<string, string>) => ({ cmd: 'goto', args: [vals.url] }),
  },
  {
    id: 'screenshot',
    label: 'Take a screenshot',
    icon: Camera,
    description: 'Capture what the AI browser currently sees',
    fields: [],
    buildCommand: () => ({ cmd: 'screenshot', args: [] }),
  },
  {
    id: 'read-text',
    label: 'Read page text',
    icon: Type,
    description: 'Get all the visible text content from the current page',
    fields: [],
    buildCommand: () => ({ cmd: 'text', args: [] }),
  },
  {
    id: 'get-links',
    label: 'List all links',
    icon: Link2,
    description: 'Show every link on the current page',
    fields: [],
    buildCommand: () => ({ cmd: 'links', args: [] }),
  },
  {
    id: 'click',
    label: 'Click an element',
    icon: MousePointer,
    description: 'Click a button or link on the page using its CSS selector',
    fields: [{ key: 'selector', label: 'Element to click (CSS selector or text)', placeholder: 'button.submit  or  #login-btn', type: 'text' }],
    buildCommand: (vals: Record<string, string>) => ({ cmd: 'click', args: [vals.selector] }),
  },
  {
    id: 'fill-form',
    label: 'Fill in a form field',
    icon: Type,
    description: 'Type text into an input field on the page',
    fields: [
      { key: 'selector', label: 'Field selector', placeholder: 'input[name="email"]  or  #search', type: 'text' },
      { key: 'text',     label: 'Text to type',   placeholder: 'hello@example.com',                type: 'text' },
    ],
    buildCommand: (vals: Record<string, string>) => ({ cmd: 'fill', args: [vals.selector, vals.text] }),
  },
  {
    id: 'get-html',
    label: 'Get page HTML',
    icon: FileCode,
    description: 'Download the full HTML source of the current page',
    fields: [],
    buildCommand: () => ({ cmd: 'html', args: [] }),
  },
  {
    id: 'list-tabs',
    label: 'Show open tabs',
    icon: List,
    description: 'See all currently open browser tabs',
    fields: [],
    buildCommand: () => ({ cmd: 'tabs', args: [] }),
  },
  {
    id: 'back',
    label: 'Go back',
    icon: ArrowLeft,
    description: 'Navigate to the previous page',
    fields: [],
    buildCommand: () => ({ cmd: 'back', args: [] }),
  },
  {
    id: 'forward',
    label: 'Go forward',
    icon: ArrowRight,
    description: 'Navigate to the next page',
    fields: [],
    buildCommand: () => ({ cmd: 'forward', args: [] }),
  },
  {
    id: 'reload',
    label: 'Reload page',
    icon: RotateCw,
    description: 'Refresh the current page',
    fields: [],
    buildCommand: () => ({ cmd: 'reload', args: [] }),
  },
]

// Full reference of gstack browse daemon commands
const COMMAND_REFERENCE = [
  {
    category: 'Navigation',
    commands: [
      { cmd: 'goto',      args: '<url>',            desc: 'Navigate to a URL' },
      { cmd: 'back',      args: '',                 desc: 'Browser back' },
      { cmd: 'forward',   args: '',                 desc: 'Browser forward' },
      { cmd: 'reload',    args: '',                 desc: 'Reload current page' },
      { cmd: 'url',       args: '',                 desc: 'Get current page URL' },
      { cmd: 'title',     args: '',                 desc: 'Get page title' },
      { cmd: 'load-html', args: '<html>',           desc: 'Load raw HTML via setContent' },
      { cmd: 'frame',     args: '<selector>',       desc: 'Switch into an iframe context' },
    ]
  },
  {
    category: 'Content',
    commands: [
      { cmd: 'text',             args: '',           desc: 'Get visible page text' },
      { cmd: 'html',             args: '',           desc: 'Get full page HTML' },
      { cmd: 'screenshot',       args: '[--selector <css>]', desc: 'Take a screenshot (base64); optionally clip to element' },
      { cmd: 'prettyscreenshot', args: '',           desc: 'Clean screenshot — removes ads/banners first' },
      { cmd: 'links',            args: '',           desc: 'List all links on the page' },
      { cmd: 'inputs',           args: '',           desc: 'List all input fields' },
      { cmd: 'buttons',          args: '',           desc: 'List all buttons' },
      { cmd: 'select',           args: '<selector>', desc: 'Get text of a CSS element' },
      { cmd: 'media',            args: '',           desc: 'All media elements (images, videos, audio) with URLs and dimensions' },
      { cmd: 'data',             args: '',           desc: 'Structured data: JSON-LD, Open Graph, Twitter Cards, meta tags' },
      { cmd: 'scrape',           args: '',           desc: 'Bulk download all media assets from the current page' },
      { cmd: 'archive',          args: '',           desc: 'Save complete page as MHTML via CDP' },
    ]
  },
  {
    category: 'Interaction',
    commands: [
      { cmd: 'click',     args: '<selector>',         desc: 'Click an element' },
      { cmd: 'type',      args: '<selector> <text>',  desc: 'Type text into an element' },
      { cmd: 'fill',      args: '<selector> <text>',  desc: 'Fill an input field' },
      { cmd: 'submit',    args: '<selector>',         desc: 'Submit a form' },
      { cmd: 'hover',     args: '<selector>',         desc: 'Hover over an element' },
      { cmd: 'scroll',    args: '<amount>',           desc: 'Scroll the page by pixels' },
      { cmd: 'scroll-to', args: '<selector>',         desc: 'Scroll element into view' },
      { cmd: 'style',     args: '<selector> <prop> <value>', desc: 'Set a CSS property on an element (undoable)' },
      { cmd: 'cleanup',   args: '',                   desc: 'Remove ads, cookie banners, and sticky clutter from the page' },
    ]
  },
  {
    category: 'Tabs',
    commands: [
      { cmd: 'tabs',       args: '',             desc: 'List all open tabs' },
      { cmd: 'tab-open',   args: '<url>',        desc: 'Open a new tab' },
      { cmd: 'tab-close',  args: '<id>',         desc: 'Close a tab by ID' },
      { cmd: 'tab-switch', args: '<id>',         desc: 'Switch to a tab by ID' },
    ]
  },
  {
    category: 'Storage & Network',
    commands: [
      { cmd: 'cookies',       args: '',            desc: 'Get all cookies' },
      { cmd: 'local-storage', args: '',            desc: 'Get localStorage contents' },
      { cmd: 'network',       args: '',            desc: 'List recent network requests' },
      { cmd: 'state',         args: '[save|load]', desc: 'Save or restore full browser state (cookies + URLs)' },
      { cmd: 'wait',          args: '<ms>',        desc: 'Wait N milliseconds' },
      { cmd: 'wait-for',      args: '<selector>',  desc: 'Wait for element to appear' },
    ]
  },
  {
    category: 'Inspection',
    commands: [
      { cmd: 'inspect',   args: '<selector>', desc: 'Deep CSS inspection via CDP — full rule cascade, box model, computed styles' },
      { cmd: 'ux-audit',  args: '',           desc: 'Extract page structure for UX behavioural analysis — returns JSON' },
    ]
  },
  {
    category: 'Session',
    commands: [
      { cmd: 'handoff', args: '', desc: 'Open visible Chrome at current page for user takeover' },
      { cmd: 'resume',  args: '', desc: 'Re-snapshot after user takeover and return control to AI' },
      { cmd: 'watch',   args: '', desc: 'Passive observation — periodic snapshots while user browses' },
    ]
  },
]

let seq = 0

export default function Browse() {
  const { state } = useDaemon()
  const [mode, setMode] = useState<'task' | 'terminal' | 'script'>(
    () => (localStorage.getItem('browse-mode') as 'task' | 'terminal' | 'script') ?? 'terminal'
  )
  const [input, setInput] = useState('')
  const [script, setScript] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [running, setRunning] = useState(false)
  const [showRef, setShowRef] = useState(false)
  const [copiedLogs, setCopiedLogs] = useState(false)
  const [scriptProgress, setScriptProgress] = useState<{ done: number; total: number } | null>(null)

  // Task mode state
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [taskFields, setTaskFields] = useState<Record<string, string>>({})

  // Command history
  const historyRef = useRef<string[]>([])
  const historyPosRef = useRef(-1)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  function addLog(type: LogEntry['type'], text: string) {
    const time = new Date().toLocaleTimeString('en', { hour12: false })
    setLogs(prev => [...prev, { id: seq++, type, text, time }])
  }

  async function runCommand(raw: string) {
    const parts = raw.trim().split(/\s+/)
    const [cmd, ...args] = parts
    if (!cmd) return

    historyRef.current = [raw.trim(), ...historyRef.current.filter(h => h !== raw.trim())].slice(0, 100)
    historyPosRef.current = -1

    addLog('command', raw.trim())
    setRunning(true)
    try {
      const result = await client.command(cmd, args)
      addLog('result', typeof result === 'string' ? result : JSON.stringify(result, null, 2))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      addLog('error', msg)
      toast.error(`Command failed: ${msg.slice(0, 80)}`)
    } finally {
      setRunning(false)
    }
  }

  async function runTaskPreset() {
    const preset = TASK_PRESETS.find(t => t.id === selectedTask)
    if (!preset) return
    const { cmd, args } = preset.buildCommand(taskFields)
    const raw = [cmd, ...args].join(' ')
    await runCommand(raw)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !state.running) return
    runCommand(input)
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const pos = historyPosRef.current + 1
      if (pos < historyRef.current.length) {
        historyPosRef.current = pos
        setInput(historyRef.current[pos])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const pos = historyPosRef.current - 1
      if (pos < 0) {
        historyPosRef.current = -1
        setInput('')
      } else {
        historyPosRef.current = pos
        setInput(historyRef.current[pos])
      }
    }
  }

  async function runScript() {
    const lines = script.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    if (!lines.length) return
    setRunning(true)
    setScriptProgress({ done: 0, total: lines.length })
    addLog('command', `--- Running script: ${lines.length} command${lines.length !== 1 ? 's' : ''} ---`)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      setScriptProgress({ done: i, total: lines.length })
      const [cmd, ...args] = line.split(/\s+/)
      addLog('command', line)
      try {
        const result = await client.command(cmd, args)
        addLog('result', typeof result === 'string' ? result : JSON.stringify(result, null, 2))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        addLog('error', msg)
        toast.error(`Script stopped at line ${i + 1}: ${msg.slice(0, 60)}`)
        setRunning(false)
        setScriptProgress(null)
        return
      }
    }
    addLog('command', `--- Script complete (${lines.length} command${lines.length !== 1 ? 's' : ''}) ---`)
    toast.success(`Script finished — ${lines.length} commands ran`)
    setRunning(false)
    setScriptProgress(null)
  }

  async function copyLogs() {
    const text = logs.map(l =>
      `${l.time} ${l.type === 'command' ? '❯' : l.type === 'error' ? '✗' : '·'} ${l.text}`
    ).join('\n')
    await navigator.clipboard.writeText(text)
    setCopiedLogs(true)
    toast.success('Logs copied to clipboard')
    setTimeout(() => setCopiedLogs(false), 2000)
  }

  const activeTask = TASK_PRESETS.find(t => t.id === selectedTask)
  const taskIsReady = activeTask && activeTask.fields.every(f => taskFields[f.key]?.trim())

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Browser Automation</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Control a headless web browser — navigate, read, and interact with any website</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode tabs */}
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden text-xs">
            <button
              onClick={() => { setMode('task'); localStorage.setItem('browse-mode', 'task') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                mode === 'task' ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Globe size={12} /> Tasks
            </button>
            <button
              onClick={() => { setMode('terminal'); localStorage.setItem('browse-mode', 'terminal') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                mode === 'terminal' ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Terminal size={12} /> Terminal
            </button>
            <button
              onClick={() => { setMode('script'); localStorage.setItem('browse-mode', 'script') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                mode === 'script' ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <FileCode size={12} /> Script
            </button>
          </div>
          {mode !== 'task' && (
            <button
              onClick={() => setShowRef(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                showRef
                  ? 'border-indigo-700/60 bg-indigo-900/20 text-indigo-300'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600'
              }`}
            >
              <BookOpen size={12} />
              {showRef ? 'Hide' : 'Commands'}
              {showRef ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>
      </div>

      {/* Command reference panel (terminal/script modes) */}
      {showRef && mode !== 'task' && (
        <div className="border-b border-zinc-200/60 dark:border-zinc-800/60 px-6 py-4 overflow-y-auto max-h-72 bg-zinc-100/30 dark:bg-zinc-900/30">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {COMMAND_REFERENCE.map(group => (
              <div key={group.category}>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">{group.category}</p>
                <div className="space-y-0.5">
                  {group.commands.map(c => (
                    <button
                      key={c.cmd}
                      onClick={() => {
                        const full = c.args ? `${c.cmd} ${c.args}` : c.cmd
                        setInput(full)
                        setShowRef(false)
                        inputRef.current?.focus()
                      }}
                      title={c.desc}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors text-left group"
                    >
                      <code className="text-xs font-mono text-indigo-400 shrink-0 w-28 truncate">{c.cmd}</code>
                      <span className="text-xs text-zinc-500 truncate group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log output */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 font-mono text-xs">
        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-600 gap-3">
            <Globe size={28} />
            <p className="text-center">
              {state.running
                ? mode === 'task'
                  ? 'Pick a task below to get started.'
                  : 'Type a command below or pick a quick action above.\nUse ↑/↓ to cycle through history.'
                : 'Start the AI Browser on the Dashboard first, then control it here.'
              }
            </p>
          </div>
        )}
        {logs.map(entry => (
          <div key={entry.id} className={`flex gap-3 ${
            entry.type === 'command' ? 'text-indigo-400' :
            entry.type === 'error'   ? 'text-red-400' :
                                       'text-zinc-700 dark:text-zinc-300'
          }`}>
            <span className="text-zinc-700 shrink-0">{entry.time}</span>
            <span className="shrink-0">
              {entry.type === 'command' ? '❯' : entry.type === 'error' ? '✗' : '·'}
            </span>
            <pre className="whitespace-pre-wrap break-all flex-1">{entry.text}</pre>
          </div>
        ))}
        {running && (
          <div className="flex gap-3 text-zinc-500">
            <span className="animate-pulse">···</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Task mode ──────────────────────────────────────────────────── */}
      {mode === 'task' && (
        <div className="border-t border-zinc-200/60 dark:border-zinc-800/60 p-4 space-y-3">
          {/* Task picker */}
          {!selectedTask ? (
            <>
              <p className="text-xs text-zinc-500 font-medium">Choose a task:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TASK_PRESETS.map(task => {
                  const Icon = task.icon
                  return (
                    <button
                      key={task.id}
                      disabled={!state.running}
                      onClick={() => { setSelectedTask(task.id); setTaskFields({}) }}
                      className="flex items-start gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-indigo-700/50 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-left group"
                    >
                      <Icon size={13} className="text-indigo-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white">{task.label}</p>
                        <p className="text-xs text-zinc-500 leading-snug mt-0.5">{task.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              {!state.running && (
                <p className="text-xs text-zinc-600 text-center">Start the AI Browser on the Dashboard to enable tasks</p>
              )}
            </>
          ) : (
            /* Task form */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSelectedTask(null); setTaskFields({}) }}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors flex items-center gap-1"
                >
                  ← Back
                </button>
                <span className="text-xs text-zinc-600">·</span>
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{activeTask?.label}</p>
              </div>

              {activeTask?.fields.map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{field.label}</label>
                  <input
                    type={field.type}
                    value={taskFields[field.key] ?? ''}
                    onChange={e => setTaskFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                </div>
              ))}

              {activeTask?.fields.length === 0 && (
                <p className="text-xs text-zinc-500">{activeTask.description} — no parameters needed.</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedTask(null); setTaskFields({}) }}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={runTaskPreset}
                  disabled={!state.running || running || !taskIsReady}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  {running ? <><Square size={12} className="animate-pulse" /> Running…</> : <><Play size={12} /> Run task</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Terminal mode ──────────────────────────────────────────────── */}
      {mode === 'terminal' && (
        <>
          {/* Quick examples */}
          {!showRef && (
            <div className="px-6 py-2.5 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs text-zinc-600 shrink-0">Quick:</span>
              {[
                { cmd: 'goto', args: ['https://example.com'] },
                { cmd: 'screenshot' },
                { cmd: 'text' },
                { cmd: 'links' },
                { cmd: 'tabs' },
                { cmd: 'url' },
              ].map(ex => (
                <button
                  key={ex.cmd}
                  disabled={!state.running}
                  onClick={() => runCommand([ex.cmd, ...(ex.args ?? [])].join(' '))}
                  className="shrink-0 px-2.5 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
                >
                  {ex.cmd}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="px-6 py-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex gap-3">
            <div className="flex-1 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 focus-within:border-indigo-600 transition-colors">
              <span className="text-zinc-500 dark:text-zinc-600 font-mono text-sm">❯</span>
              <input
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); historyPosRef.current = -1 }}
                onKeyDown={handleKeyDown}
                placeholder={state.running ? 'goto https://… · screenshot · text   (↑/↓ history)' : 'Start the AI Browser first'}
                disabled={!state.running}
                className="flex-1 bg-transparent text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 outline-none font-mono"
              />
            </div>
            <div className="flex gap-2">
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={copyLogs}
                  title="Copy all logs"
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  {copiedLogs ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setLogs([])}
                title="Clear log"
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                <Trash2 size={15} />
              </button>
              <button
                type="submit"
                disabled={!state.running || !input.trim() || running}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Send size={14} />
                Run
              </button>
            </div>
          </form>
        </>
      )}

      {/* ── Script mode ────────────────────────────────────────────────── */}
      {mode === 'script' && (
        <div className="border-t border-zinc-200/60 dark:border-zinc-800/60 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              One command per line · lines starting with <code className="font-mono text-zinc-400">#</code> are comments
            </p>
            {scriptProgress && (
              <span className="text-xs text-indigo-400 font-mono">
                {scriptProgress.done} / {scriptProgress.total}
              </span>
            )}
          </div>
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            placeholder={`# Example script\ngoto https://example.com\nscreenshot\ntext\nlinks`}
            disabled={!state.running || running}
            rows={5}
            className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-mono text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-600 transition-colors resize-y disabled:opacity-50"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setLogs([])}
              title="Clear log"
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors text-xs flex items-center gap-1.5"
            >
              <Trash2 size={12} /> Clear log
            </button>
            {running ? (
              <button
                disabled
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-zinc-700 text-zinc-400 text-sm font-medium cursor-not-allowed"
              >
                <Square size={12} className="animate-pulse" /> Running…
              </button>
            ) : (
              <button
                onClick={runScript}
                disabled={!state.running || !script.trim()}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                <Play size={12} /> Run Script
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
