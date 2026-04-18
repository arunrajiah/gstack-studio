import { useState, useRef, useEffect } from 'react'
import { Send, Terminal, Trash2 } from 'lucide-react'
import { client } from '../lib/gstack-client'
import { useDaemon } from '../lib/store'

interface LogEntry {
  id: number
  type: 'command' | 'result' | 'error'
  text: string
  time: string
}

const EXAMPLE_COMMANDS = [
  { cmd: 'goto', args: ['https://example.com'], label: 'Navigate to URL' },
  { cmd: 'screenshot', args: [], label: 'Screenshot' },
  { cmd: 'text', args: [], label: 'Get page text' },
  { cmd: 'links', args: [], label: 'List links' },
  { cmd: 'tabs', args: [], label: 'List tabs' },
]

let seq = 0

export default function Browse() {
  const { state } = useDaemon()
  const [input, setInput] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [running, setRunning] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

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
    addLog('command', raw.trim())
    setRunning(true)
    try {
      const result = await client.command(cmd, args)
      addLog('result', typeof result === 'string' ? result : JSON.stringify(result, null, 2))
    } catch (err) {
      addLog('error', String(err))
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800/60">
        <h1 className="text-xl font-semibold text-zinc-100">Browse Console</h1>
        <p className="text-sm text-zinc-500 mt-0.5">56 browser commands via the gstack daemon</p>
      </div>

      {/* Quick examples */}
      <div className="px-6 py-3 border-b border-zinc-800/60 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs text-zinc-600 shrink-0">Quick:</span>
        {EXAMPLE_COMMANDS.map(ex => (
          <button
            key={ex.cmd}
            disabled={!state.running}
            onClick={() => runCommand([ex.cmd, ...ex.args].join(' '))}
            className="shrink-0 px-2.5 py-1 text-xs rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
          >
            {ex.cmd}
          </button>
        ))}
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 font-mono text-xs">
        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-600 gap-3">
            <Terminal size={28} />
            <p>Type a command below or pick a quick action above</p>
          </div>
        )}
        {logs.map(entry => (
          <div key={entry.id} className={`flex gap-3 ${
            entry.type === 'command' ? 'text-indigo-400' :
            entry.type === 'error'   ? 'text-red-400' :
                                       'text-zinc-300'
          }`}>
            <span className="text-zinc-700 shrink-0">{entry.time}</span>
            <span className="shrink-0">
              {entry.type === 'command' ? '❯' : entry.type === 'error' ? '✗' : '·'}
            </span>
            <pre className="whitespace-pre-wrap break-all">{entry.text}</pre>
          </div>
        ))}
        {running && (
          <div className="flex gap-3 text-zinc-500">
            <span className="animate-pulse">···</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="px-6 py-4 border-t border-zinc-800/60 flex gap-3">
        <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 focus-within:border-indigo-600 transition-colors">
          <span className="text-zinc-600 font-mono text-sm">❯</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={state.running ? 'goto https://… · screenshot · text · links · tabs' : 'Start the daemon first'}
            disabled={!state.running}
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none font-mono"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLogs([])}
            className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
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
    </div>
  )
}
