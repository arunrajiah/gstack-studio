import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, AlertTriangle, Folder, ChevronRight, Zap, FolderOpen } from 'lucide-react'
import { useDaemon, useSkills } from '../lib/store'
import { client, GStackProject } from '../lib/gstack-client'

const QUICK_ACTIONS = ['review', 'qa', 'ship', 'health', 'autoplan', 'cso']

export default function Dashboard() {
  const { state, loading, start } = useDaemon()
  const { skills } = useSkills()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<GStackProject[]>([])

  useEffect(() => {
    client.projects().then(setProjects).catch(console.error)
  }, [])

  const quickSkills = skills.filter(s => QUICK_ACTIONS.includes(s.id))
  const gstackMissing = !loading && !state.gstackPath
  const workspaceMissing = !loading && !state.workspacePath

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Your AI engineering team, ready to sprint</p>
      </div>

      {/* Setup needed banner */}
      {(gstackMissing || workspaceMissing) && (
        <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
            <AlertTriangle size={14} />
            Setup required
          </div>
          {gstackMissing && (
            <p className="text-xs text-zinc-400">
              gstack not found at <code className="font-mono text-zinc-300">~/.claude/skills/gstack</code>.{' '}
              <button onClick={() => navigate('/settings')} className="text-amber-400 underline">Set path in Settings</button>
              {' '}or install from <span className="font-mono text-zinc-300">github.com/garrytan/gstack</span>
            </p>
          )}
          {workspaceMissing && (
            <p className="text-xs text-zinc-400">
              No workspace directory set.{' '}
              <button onClick={() => navigate('/settings')} className="text-amber-400 underline">Configure your project folder in Settings</button>
              {' '}so the daemon knows where to run.
            </p>
          )}
        </div>
      )}

      {/* Daemon status card */}
      <div className={`rounded-xl border p-4 ${
        state.running
          ? 'border-emerald-800/40 bg-emerald-950/20'
          : 'border-zinc-800 bg-zinc-900'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              state.running ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-600'
            }`} />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {state.running ? 'Daemon running' : 'Daemon offline'}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5 truncate">
                {state.running
                  ? `Port ${state.port} · PID ${state.pid}`
                  : 'Click Start Daemon to launch the browse server'
                }
              </p>
            </div>
          </div>
          {!state.running && (
            <button
              onClick={start}
              disabled={loading || gstackMissing || workspaceMissing}
              className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              <Play size={13} />
              {loading ? 'Starting…' : 'Start Daemon'}
            </button>
          )}
        </div>

        {/* Active workspace */}
        {state.workspacePath && (
          <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500 border-t border-zinc-800/60 pt-3">
            <FolderOpen size={12} className="text-zinc-600" />
            <span className="font-mono truncate">{state.workspacePath}</span>
            <button
              onClick={() => navigate('/settings')}
              className="ml-auto shrink-0 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              change
            </button>
          </div>
        )}
      </div>

      {/* Quick actions */}
      {quickSkills.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-indigo-400" />
            <h2 className="text-sm font-medium text-zinc-300">Quick Actions</h2>
            <span className="text-xs text-zinc-600">— click to copy slash command</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {quickSkills.map(skill => (
              <QuickActionCard key={skill.id} skill={skill} />
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Folder size={14} className="text-zinc-400" />
            <h2 className="text-sm font-medium text-zinc-300">Projects</h2>
            <span className="text-xs text-zinc-600">from ~/.gstack/projects</span>
          </div>
          <div className="space-y-1.5">
            {projects.map(project => (
              <button
                key={project.slug}
                onClick={() => navigate('/history', { state: { slug: project.slug } })}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/80 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Folder size={14} className="text-zinc-500 group-hover:text-zinc-300 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-zinc-200">{project.slug}</p>
                    <p className="text-xs text-zinc-500">
                      {[project.hasLearnings && 'learnings', project.designs && 'designs'].filter(Boolean).join(' · ') || 'no data yet'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function QuickActionCard({ skill }: { skill: import('../lib/gstack-client').Skill }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await client.copyCommand(skill.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/80 transition-all text-left group"
    >
      <span className="text-lg shrink-0">{skill.icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">{skill.name}</p>
        <p className={`text-xs truncate transition-colors ${copied ? 'text-emerald-400' : 'text-zinc-500'}`}>
          {copied ? 'Copied!' : `/${skill.id}`}
        </p>
      </div>
    </button>
  )
}
