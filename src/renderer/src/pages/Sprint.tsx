import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, AlertTriangle, BookOpen, Search, X, Play, Info } from 'lucide-react'
import { useSkills, useDaemon, useConfig } from '../lib/store'
import { Skill, client } from '../lib/gstack-client'
import SkillDocModal from '../components/SkillDocModal'
import { toast } from '../lib/toast'

const PHASES: Array<{ id: Skill['phase']; label: string; color: string; accent: string; description: string }> = [
  { id: 'think',   label: 'Think',   accent: '#8b5cf6', color: 'text-violet-400 border-violet-800/50 bg-violet-950/20',   description: 'Understand the problem — research, analyse, explore' },
  { id: 'plan',    label: 'Plan',    accent: '#3b82f6', color: 'text-blue-400 border-blue-800/50 bg-blue-950/20',          description: 'Design a solution — architecture, task breakdown, specs' },
  { id: 'build',   label: 'Build',   accent: '#06b6d4', color: 'text-cyan-400 border-cyan-800/50 bg-cyan-950/20',          description: 'Write the code — implement features and fix bugs' },
  { id: 'review',  label: 'Review',  accent: '#f59e0b', color: 'text-amber-400 border-amber-800/50 bg-amber-950/20',       description: 'Check the work — code review, security scan, quality check' },
  { id: 'test',    label: 'Test',    accent: '#f97316', color: 'text-orange-400 border-orange-800/50 bg-orange-950/20',    description: 'Verify it works — run tests, catch regressions' },
  { id: 'ship',    label: 'Ship',    accent: '#10b981', color: 'text-emerald-400 border-emerald-800/50 bg-emerald-950/20', description: 'Release it — deploy, publish, version bump' },
  { id: 'reflect', label: 'Reflect', accent: '#ec4899', color: 'text-pink-400 border-pink-800/50 bg-pink-950/20',         description: 'Learn from it — document decisions, capture insights' },
  { id: 'utils',   label: 'Utils',   accent: '#71717a', color: 'text-zinc-400 border-zinc-700/50 bg-zinc-800/20',          description: "Utility agents — helpers that don't fit one phase" },
]

const PHASE_AUDIENCE: Partial<Record<Skill['phase'], string>> = {
  think:   'anyone',
  plan:    'anyone',
  review:  'anyone',
  reflect: 'anyone',
}

export default function Sprint() {
  const { skills, loading, error } = useSkills()
  const { state } = useDaemon()
  const { config } = useConfig()
  const navigate = useNavigate()
  const [docSkill, setDocSkill] = useState<Skill | null>(null)
  const [search, setSearch] = useState('')
  const [showPhaseInfo, setShowPhaseInfo] = useState(false)

  const filteredSkills = useMemo(() => {
    if (!search.trim()) return skills
    const q = search.toLowerCase()
    return skills.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.phase.toLowerCase().includes(q)
    )
  }, [skills, search])

  if (error) {
    return (
      <div className="page-enter p-6 flex items-start gap-3 text-amber-400">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Could not load agents</p>
          <p className="text-xs text-zinc-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  const gstackMissing = !state.gstackPath && !loading

  return (
    <div className="page-enter p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Agent Board</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {loading
              ? 'Loading agents…'
              : search.trim()
                ? `${filteredSkills.length} of ${skills.length} agents matching "${search}"`
                : `${skills.length} AI agents — click any card to copy its command`
            }
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {gstackMissing && (
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-1.5 hover:bg-amber-950/50 transition-colors"
            >
              <AlertTriangle size={12} />
              Setup required
            </button>
          )}
          <button
            onClick={() => setShowPhaseInfo(v => !v)}
            className={`btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${
              showPhaseInfo
                ? 'border-indigo-700/60 bg-indigo-900/20 text-indigo-300'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <Info size={12} />
            What are phases?
          </button>
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all">
            <Search size={13} className="text-zinc-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents…"
              className="w-36 bg-transparent text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Phase explainer */}
      {showPhaseInfo && (
        <div className="rounded-xl border border-indigo-800/30 bg-indigo-950/10 p-4 space-y-3 animate-[page-fade-in_150ms_ease-out]">
          <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">About agent phases</p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Agents are organised by the phase of work they help with — from thinking through a problem to shipping. Pick whatever you need right now.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PHASES.filter(p => p.id !== 'utils').map(phase => (
              <div key={phase.id} className="p-2.5 rounded-lg bg-zinc-200/40 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/40">
                <span className={`inline-flex text-xs font-medium px-1.5 py-0.5 rounded-full border mb-1.5 ${phase.color}`}>
                  {phase.label}
                </span>
                <p className="text-xs text-zinc-500 leading-snug">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase pipeline strip */}
      {!showPhaseInfo && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {PHASES.filter(p => p.id !== 'utils').map((phase, i, arr) => (
            <div key={phase.id} className="flex items-center gap-1 shrink-0" title={phase.description}>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${phase.color}`}>
                {phase.label}
              </span>
              {i < arr.length - 1 && <span className="text-zinc-300 dark:text-zinc-700 text-xs">→</span>}
            </div>
          ))}
        </div>
      )}

      {/* Skill doc modal */}
      {docSkill && <SkillDocModal skill={docSkill} onClose={() => setDocSkill(null)} />}

      {/* Skeleton loading */}
      {loading && (
        <div className="space-y-6">
          {[1, 2, 3].map(g => (
            <div key={g}>
              <div className="skeleton h-5 w-24 mb-3 rounded-full" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {[1,2,3,4].map(c => (
                  <div key={c} className="h-28 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5">
                    <div className="skeleton h-6 w-6 rounded-lg mb-2" />
                    <div className="skeleton h-3.5 w-3/4 mb-1.5 rounded" />
                    <div className="skeleton h-2.5 w-full rounded mb-1" />
                    <div className="skeleton h-2.5 w-2/3 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skills by phase */}
      {!loading && (
        <div className="space-y-6">
          {filteredSkills.length === 0 && search && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
              <Search size={24} className="text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm">No agents match "{search}"</p>
              <button onClick={() => setSearch('')} className="text-xs text-indigo-400 hover:underline">Clear search</button>
            </div>
          )}
          {PHASES.map(phase => {
            const phaseSkills = filteredSkills.filter(s => s.phase === phase.id)
            if (!phaseSkills.length) return null
            const audience = PHASE_AUDIENCE[phase.id]
            return (
              <div key={phase.id}>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${phase.color}`}>
                    {phase.label}
                  </span>
                  <span className="text-xs text-zinc-500">{phase.description}</span>
                  {audience === 'anyone' && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-950/30 border border-emerald-800/30 text-emerald-500">for everyone</span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {phaseSkills.map(skill => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      phaseAccent={phase.accent}
                      phaseClass={`phase-${phase.id}`}
                      hostBin={config.hostBin}
                      onViewDoc={() => setDocSkill(skill)}
                      onNavigateSettings={() => navigate('/settings')}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SkillCard({ skill, phaseAccent, phaseClass, hostBin, onViewDoc, onNavigateSettings }: {
  skill: Skill
  phaseAccent: string
  phaseClass: string
  hostBin: string
  onViewDoc: () => void
  onNavigateSettings: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [running, setRunning] = useState(false)

  async function handleCopy() {
    await client.copyCommand(skill.id)
    setCopied(true)
    toast.success(`/${skill.id} copied to clipboard`)
    setTimeout(() => setCopied(false), 1800)
  }

  async function handleRun(e: React.MouseEvent) {
    e.stopPropagation()
    if (!hostBin) {
      toast.error('No AI host configured — set one in Settings')
      onNavigateSettings()
      return
    }
    setRunning(true)
    try {
      await client.executeSkill(skill.id, hostBin)
      toast.success(`Opened /${skill.id} in terminal`)
    } catch (err) {
      toast.error(`Failed to open terminal: ${String(err)}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div
      className={`card-lift relative flex flex-col p-3.5 rounded-xl border-l-[3px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer group ${phaseClass}`}
      style={{ borderLeftColor: phaseAccent }}
      onClick={handleCopy}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl leading-none">{skill.icon}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onViewDoc() }}
            title="View full documentation"
            className="p-1 rounded-md text-zinc-400 hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
          >
            <BookOpen size={12} />
          </button>
          <button
            onClick={handleRun}
            title="Run in AI host"
            disabled={running}
            className="p-1 rounded-md text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors disabled:opacity-50"
          >
            <Play size={12} className={running ? 'animate-pulse text-emerald-400' : ''} />
          </button>
          {copied
            ? <Check size={12} className="text-emerald-400" />
            : <Copy size={12} className="text-zinc-400" />
          }
        </div>
      </div>

      {/* Name */}
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-tight">{skill.name}</p>

      {/* Description — always visible */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-snug line-clamp-2 flex-1">{skill.description}</p>

      {/* Footer: command */}
      <div className="mt-2.5 flex items-center justify-between">
        <code className={`text-xs font-mono transition-colors ${
          copied ? 'text-emerald-400' : 'text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400'
        }`}>
          /{skill.id}
        </code>
        {copied
          ? <span className="text-xs text-emerald-400 font-medium">Copied!</span>
          : <span className="text-[10px] text-zinc-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">click to copy</span>
        }
      </div>
    </div>
  )
}
