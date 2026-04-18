import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, AlertTriangle, BookOpen } from 'lucide-react'
import { useSkills, useDaemon } from '../lib/store'
import { Skill, client } from '../lib/gstack-client'
import SkillDocModal from '../components/SkillDocModal'
import { toast } from '../lib/toast'

const PHASES: Array<{ id: Skill['phase']; label: string; color: string }> = [
  { id: 'think',   label: 'Think',   color: 'text-violet-400 border-violet-800/50 bg-violet-950/20' },
  { id: 'plan',    label: 'Plan',    color: 'text-blue-400 border-blue-800/50 bg-blue-950/20' },
  { id: 'build',   label: 'Build',   color: 'text-cyan-400 border-cyan-800/50 bg-cyan-950/20' },
  { id: 'review',  label: 'Review',  color: 'text-amber-400 border-amber-800/50 bg-amber-950/20' },
  { id: 'test',    label: 'Test',    color: 'text-orange-400 border-orange-800/50 bg-orange-950/20' },
  { id: 'ship',    label: 'Ship',    color: 'text-emerald-400 border-emerald-800/50 bg-emerald-950/20' },
  { id: 'reflect', label: 'Reflect', color: 'text-pink-400 border-pink-800/50 bg-pink-950/20' },
  { id: 'utils',   label: 'Utils',   color: 'text-zinc-400 border-zinc-700/50 bg-zinc-800/20' },
]

export default function Sprint() {
  const { skills, loading, error } = useSkills()
  const { state } = useDaemon()
  const navigate = useNavigate()
  const [docSkill, setDocSkill] = useState<Skill | null>(null)

  if (error) {
    return (
      <div className="p-6 flex items-start gap-3 text-amber-400">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Could not load skills</p>
          <p className="text-xs text-zinc-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  const gstackMissing = !state.gstackPath && !loading

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Sprint Board</h1>
          <p className="text-sm text-zinc-500 mt-0.5">23 AI agents — click any card to copy its slash command</p>
        </div>
        {gstackMissing && (
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-1.5 hover:bg-amber-950/50 transition-colors"
          >
            <AlertTriangle size={12} />
            gstack not configured
          </button>
        )}
      </div>

      {/* Phase pipeline */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {PHASES.filter(p => p.id !== 'utils').map((phase, i, arr) => (
          <div key={phase.id} className="flex items-center gap-1 shrink-0">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${phase.color}`}>
              {phase.label}
            </span>
            {i < arr.length - 1 && <span className="text-zinc-700">→</span>}
          </div>
        ))}
      </div>

      {/* Skill doc modal */}
      {docSkill && <SkillDocModal skill={docSkill} onClose={() => setDocSkill(null)} />}

      {/* Skills by phase */}
      <div className="space-y-5">
        {PHASES.map(phase => {
          const phaseSkills = skills.filter(s => s.phase === phase.id)
          if (!phaseSkills.length) return null
          return (
            <div key={phase.id}>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mb-3 ${phase.color}`}>
                {phase.label}
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {phaseSkills.map(skill => (
                  <SkillCard key={skill.id} skill={skill} onViewDoc={() => setDocSkill(skill)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SkillCard({ skill, onViewDoc }: { skill: Skill; onViewDoc: () => void }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await client.copyCommand(skill.id)
    setCopied(true)
    toast.success(`/${skill.id} copied to clipboard`)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div
      className="relative p-3.5 rounded-xl border transition-all group border-zinc-800 bg-zinc-900 hover:border-indigo-700/60 hover:bg-zinc-800/80 cursor-pointer"
      onClick={handleCopy}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl">{skill.icon}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onViewDoc() }}
            title="View documentation"
            className="p-0.5 rounded text-zinc-500 hover:text-indigo-300 transition-colors"
          >
            <BookOpen size={12} />
          </button>
          {copied
            ? <Check size={12} className="text-emerald-400" />
            : <Copy size={12} className="text-zinc-500" />
          }
        </div>
      </div>

      <p className="text-sm font-medium text-zinc-200 leading-tight">{skill.name}</p>
      <p className="text-xs text-zinc-500 mt-1 leading-snug line-clamp-2">{skill.description}</p>

      <div className="mt-2.5 flex items-center justify-between">
        <code className={`text-xs font-mono transition-colors ${copied ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
          /{skill.id}
        </code>
        {copied && <span className="text-xs text-emerald-400">Copied!</span>}
      </div>
    </div>
  )
}
