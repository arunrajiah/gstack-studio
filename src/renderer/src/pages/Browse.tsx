import { useState, useRef, useEffect } from 'react'
import { Send, Terminal, Trash2, Copy, Check, ChevronDown, ChevronUp, BookOpen, Play, Square, FileCode } from 'lucide-react'
import { client } from '../lib/gstack-client'
import { useDaemon } from '../lib/store'
import { toast } from '../lib/toast'

interface LogEntry {
  id: number
  type: 'command' | 'result' | 'error'
  text: string
  time: string
}

// Full reference of gstack browse daemon commands
const COMMAND_REFERENCE = [
  {
    category: 'Navigation',
    commands: [
      { cmd: 'goto',    args: '<url>',     desc: 'Navigate to a URL' },
      { cmd: 'back',    args: '',          desc: 'Browser back' },
      { cmd: 'forward', args: '',          desc: 'Browser forward' },
      { cmd: 'reload',  args: '',          desc: 'Reload current page' },
      { cmd: 'url',     args: '',          desc: 'Get current page URL' },
      { cmd: 'title',   args: '',          desc: 'Get page title' },
    ]
  },
  {
    category: 'Content',
    commands: [
      { cmd: 'text',       args: '',           desc: 'Get visible page text' },
      { cmd: 'html',       args: '',           desc: 'Get full page HTML' },
      { cmd: 'screenshot', args: '',           desc: 'Take a screenshot (base64)' },
      { cmd: 'links',      args: '',           desc: 'List all links on the page' },
      { cmd: 'inputs',     args: '',           desc: 'List all input fields' },
      { cmd: 'buttons',    args: '',           desc: 'List all buttons' },
      { cmd: 'select',     args: '<selector>', desc: 'Get text of a CSS element' },
    ]
  },
  {
    category: 'Interaction',
    commands: [
      { cmd: 'click',      args: '<selector>',      desc: 'Click an element' },
      { cmd: 'type',       args: '<selector> <text>',desc: 'Type text into an element' },
      { cmd: 'fill',       args: '<selector> <text>',desc: 'Fill an input field' },
      { cmd: 'submit',     args: '<selector>',      desc: 'Submit a form' },
      { cmd: 'hover',      args: '<selector>',      desc: 'Hover over an element' },
      { cmd: 'scroll',     args: '<amount>',        desc: 'Scroll the page by pixels' },
      { cmd: 'scroll-to',  args: '<selector>',      desc: 'Scroll element into view' },
    ]
  },
  {
    category: 'Tabs',
    commands: [
      { cmd: 'tabs',        args: '',      desc: 'List all open tabs' },
      { cmd: 'tab-open',    args: '<url>', desc: 'Open a new tab' },
      { cmd: 'tab-close',   args: '<id>',  desc: 'Close a tab by ID' },
      { cmd: 'tab-switch',  args: '<id>',  desc: 'Switch to a tab by ID' },
    ]
  },
  {
    category: 'Storage & Network',
    commands: [
      { cmd: 'cookies',      args: '',           desc: 'Get all cookies' },
      { cmd: 'local-storage',args: '',           desc: 'Get localStorage contents' },
      { cmd: 'network',      args: '',           desc: 'List recent network requests' },
      { cmd: 'wait',         args: '<ms>',       desc: 'Wait N milliseconds' },
      { cmd: 'wait-for',     args: '<selector>', desc: 'Wait for element to appear' },
    ]
  },
]

let seq = 0

export default function Browse() {
  const { state } = useDaemon()
  const [mode, setMode] = useState<'terminal' | 'script'>('terminal')
  const [input, setInput] = useState('')
  const [script, setScript] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [running, setRunning] = useState(false)
  const [showRef, setShowRef] = useState(false)
  const [copiedLogs, setCopiedLogs] = useState(false)
  const [scriptProgress, setScriptProgress] = useState<{ done: number; total: number } | null>(null)

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

    // Add to history (deduplicated, newest first)
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Browse Console</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Browser automation via the gstack daemon</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode tabs */}
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden text-xs">
            <button
              onClick={() => setMode('terminal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                mode === 'terminal' ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Terminal size={12} /> Terminal
            </button>
            <button
              onClick={() => setMode('script')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                mode === 'script' ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <FileCode size={12} /> Script
            </button>
          </div>
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
        </div>
      </div>

      {/* Command reference panel */}
      {showRef && (
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

      {/* Log output */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 font-mono text-xs">
        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-600 gap-3">
            <Terminal size={28} />
            <p className="text-center">
              {state.running
                ? 'Type a command below or pick a quick action above.\nUse ↑/↓ to cycle through history.'
                : 'Start the daemon on the Dashboard, then run browser commands here.'
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

      {/* Input area — Terminal or Script mode */}
      {mode === 'terminal' ? (
        <form onSubmit={handleSubmit} className="px-6 py-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 focus-within:border-indigo-600 transition-colors">
            <span className="text-zinc-500 dark:text-zinc-600 font-mono text-sm">❯</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); historyPosRef.current = -1 }}
              onKeyDown={handleKeyDown}
              placeholder={state.running ? 'goto https://… · screenshot · text   (↑/↓ history)' : 'Start the daemon first'}
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
      ) : (
        /* Script mode */
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
