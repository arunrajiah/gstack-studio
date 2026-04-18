import { useState, useRef, useEffect } from 'react'
import { Bot, Copy, Check, Search, X, Wifi, WifiOff, BookOpen } from 'lucide-react'
import { useSkills, useDaemon, useDaemonLogs } from '../lib/store'
import { client, Skill } from '../lib/gstack-client'
import SkillDocModal from '../components/SkillDocModal'
import { toast } from '../lib/toast'

type Phase = Skill['phase'] | 'all'

const PHASE_LABELS: Record<Phase, string> = {
  all:     'All',
  think:   'Think',
  plan:    'Plan',
  build:   'Build',
  review:  'Review',
  test:    'Test',
  ship:    'Ship',
  reflect: 'Reflect',
  utils:   'Utils'
}

const PHASE_COLORS: Record<string, string> = {
  think:   'text-violet-400 border-violet-800/50 bg-violet-950/20',
  plan:    'text-blue-400 border-blue-800/50 bg-blue-950/20',
  build:   'text-cyan-400 border-cyan-800/50 bg-cyan-950/20',
  review:  'text-amber-400 border-amber-800/50 bg-amber-950/20',
  test:    'text-orange-400 border-orange-800/50 bg-orange-950/20',
  ship:    'text-emerald-400 border-emerald-800/50 bg-emerald-950/20',
  reflect: 'text-pink-400 border-pink-800/50 bg-pink-950/20',
  utils:   'text-zinc-400 border-zinc-700/50 bg-zinc-800/20'
}

export default function Agents() {
  const { skills } = useSkills()
  const { state } = useDaemon()
  const logs = useDaemonLogs(true)

  const [phase, setPhase] = useState<Phase>('all')
  const [search, setSearch] = useState('')
  const [docSkill, setDocSkill] = useState<Skill | null>(null)
  const [copiedLogs, setCopiedLogs] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll log to bottom
  useEffect(() => {
    if (autoScroll) logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, autoScroll])

  const filtered = skills.filter(s => {
    if (phase !== 'all' && s.phase !== phase) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.id.includes(q)
    }
    return true
  })

  const phases = Object.keys(PHASE_LABELS) as Phase[]

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left: Skill browser ─────────────────────────────────────────── */}
      <div className="w-72 flex flex-col border-r border-zinc-800/60 shrink-0">
        <div className="px-4 pt-4 pb-3 border-b border-zinc-800/60 space-y-3">
          <div>
            <h1 className="text-base font-semibold text-zinc-100">Agents</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Click any skill to copy its command</p>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 focus-within:border-indigo-600 transition-colors">
            <Search size={12} className="text-zinc-600 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search skills…"
              className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-zinc-400">
                <X size={11} />
              </button>
            )}
          </div>

          {/* Phase filter */}
          <div className="flex flex-wrap gap-1">
            {phases.map(p => (
              <button
                key={p}
                onClick={() => setPhase(p)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  phase === p
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800/60 hover:bg-zinc-700/60'
                }`}
              >
                {PHASE_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Skill list */}
        <div className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-xs text-zinc-600 text-center">No skills match</p>
          ) : filtered.map(skill => (
            <SkillRow key={skill.id} skill={skill} onViewDoc={() => setDocSkill(skill)} />
          ))}
        </div>

        <div className="px-4 py-2 border-t border-zinc-800/60 text-xs text-zinc-600">
          {filtered.length} skill{filtered.length !== 1 ? 's' : ''}
          {phase !== 'all' && ` in ${PHASE_LABELS[phase]}`}
        </div>
      </div>

      {/* Skill doc modal */}
      {docSkill && <SkillDocModal skill={docSkill} onClose={() => setDocSkill(null)} />}

      {/* ── Right: Live daemon log stream ──────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-3 border-b border-zinc-800/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Live Daemon Output</h2>
            <p className="text-xs text-zinc-500 mt-0.5">stdout + stderr from the gstack browse server</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={e => setAutoScroll(e.target.checked)}
                className="w-3 h-3 rounded accent-indigo-500"
              />
              Auto-scroll
            </label>
            {logs.length > 0 && (
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(logs.join('\n'))
                  setCopiedLogs(true)
                  toast.success('Logs copied to clipboard')
                  setTimeout(() => setCopiedLogs(false), 2000)
                }}
                title="Copy all logs"
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {copiedLogs ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                Copy
              </button>
            )}
            <div className={`flex items-center gap-1.5 text-xs font-medium ${state.running ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {state.running ? <Wifi size={12} /> : <WifiOff size={12} />}
              {state.running ? 'Live' : 'Offline'}
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 py-4 font-mono text-xs space-y-0.5"
          onScroll={e => {
            const el = e.currentTarget
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20
            setAutoScroll(atBottom)
          }}
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
              <Bot size={28} />
              <p className="text-center">
                {state.running
                  ? 'Waiting for daemon output…'
                  : 'Start the daemon on the Dashboard to see live output here.'
                }
              </p>
            </div>
          ) : logs.map((line, i) => (
            <LogLine key={i} line={line} />
          ))}
          <div ref={logEndRef} />
        </div>

        <div className="px-6 py-2 border-t border-zinc-800/60 text-xs text-zinc-600">
          {logs.length} line{logs.length !== 1 ? 's' : ''} · polling every 2 s
        </div>
      </div>
    </div>
  )
}

function SkillRow({ skill, onViewDoc }: { skill: Skill; onViewDoc: () => void }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await client.copyCommand(skill.id)
    setCopied(true)
    toast.success(`/${skill.id} copied to clipboard`)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-800/50 transition-colors group">
      <button onClick={handleCopy} className="flex items-start gap-3 flex-1 min-w-0 text-left">
        <span className="text-base shrink-0 mt-0.5">{skill.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-200 truncate">{skill.name}</p>
            <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full border ${PHASE_COLORS[skill.phase] ?? ''}`}>
              {skill.phase}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 leading-snug line-clamp-2">{skill.description}</p>
          <code className={`text-xs font-mono mt-1 block transition-colors ${copied ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
            /{skill.id}
          </code>
        </div>
      </button>
      <div className="flex items-center gap-1 shrink-0 mt-1">
        <button
          onClick={onViewDoc}
          title="View documentation"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700"
        >
          <BookOpen size={12} />
        </button>
        <button
          onClick={handleCopy}
          title="Copy command"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  )
}

function LogLine({ line }: { line: string }) {
  const isErr   = line.includes('[err]')
  const isStudio = line.includes('[studio]')
  const isOut   = line.includes('[out]')

  return (
    <div className={`leading-5 ${
      isErr    ? 'text-red-400' :
      isStudio ? 'text-indigo-300' :
      isOut    ? 'text-zinc-300' :
                 'text-zinc-400'
    }`}>
      {line}
    </div>
  )
}
