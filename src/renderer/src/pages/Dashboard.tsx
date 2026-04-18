import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play, Square, RotateCw, AlertTriangle, Folder, ChevronRight,
  Zap, FolderOpen, Clock, ChevronDown, ExternalLink
} from 'lucide-react'
import { useDaemon, useSkills, useRecentWorkspaces } from '../lib/store'
import { client, GStackProject } from '../lib/gstack-client'

const QUICK_ACTIONS = ['review', 'qa', 'ship', 'health', 'autoplan', 'cso']

export default function Dashboard() {
  const { state, loading, start, stop, restart } = useDaemon()
  const { skills } = useSkills()
  const { recents, switchTo } = useRecentWorkspaces()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<GStackProject[]>([])
  const [wsMenuOpen, setWsMenuOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Auto-start daemon if the user has that option enabled
  const autoStartAttempted = useRef(false)
  useEffect(() => {
    if (loading || state.running || autoStartAttempted.current) return
    client.config.get().then(cfg => {
      if (cfg.autoStartDaemon && cfg.gstackPath && cfg.workspacePath) {
        autoStartAttempted.current = true
        start()
      }
    }).catch(() => {})
  }, [loading, state.running, start])

  useEffect(() => {
    client.projects().then(setProjects).catch(console.error)
  }, [])

  const quickSkills = skills.filter(s => QUICK_ACTIONS.includes(s.id))
  const gstackMissing    = !loading && !state.gstackPath
  const workspaceMissing = !loading && !state.workspacePath

  async function handleSwitchWorkspace(path: string) {
    setActionLoading(true)
    setWsMenuOpen(false)
    try {
      await switchTo(path)
      await restart()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleBrowseWorkspace() {
    const path = await client.workspace.browse()
    if (path) handleSwitchWorkspace(path)
  }

  const busy = loading || actionLoading

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Your AI engineering team, ready to sprint</p>
      </div>

      {/* Setup banner */}
      {(gstackMissing || workspaceMissing) && (
        <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
            <AlertTriangle size={14} /> Setup required
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
              <button onClick={() => navigate('/settings')} className="text-amber-400 underline">Configure in Settings</button>
            </p>
          )}
        </div>
      )}

      {/* Daemon card */}
      <div className={`rounded-xl border p-4 transition-colors ${
        state.running ? 'border-emerald-800/40 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-900'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              busy          ? 'bg-yellow-500 animate-pulse' :
              state.running ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-600'
            }`} />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {busy ? 'Working…' : state.running ? 'Daemon running' : 'Daemon offline'}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5 truncate">
                {state.running
                  ? `Port ${state.port} · PID ${state.pid}`
                  : 'Click Start Daemon to launch the browse server'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {state.running ? (
              <>
                <button
                  onClick={restart}
                  disabled={busy}
                  title="Restart daemon"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-medium transition-colors"
                >
                  <RotateCw size={12} className={busy ? 'animate-spin' : ''} />
                  Restart
                </button>
                <button
                  onClick={stop}
                  disabled={busy}
                  title="Stop daemon"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-800/50 bg-red-950/30 hover:bg-red-950/50 disabled:opacity-40 text-xs font-medium text-red-400 transition-colors"
                >
                  <Square size={12} />
                  Stop
                </button>
              </>
            ) : (
              <button
                onClick={start}
                disabled={busy || gstackMissing || workspaceMissing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                <Play size={13} />
                {busy ? 'Starting…' : 'Start Daemon'}
              </button>
            )}
          </div>
        </div>

        {/* Workspace row with quick-switcher */}
        {state.workspacePath && (
          <div className="mt-3 border-t border-zinc-800/60 pt-3 flex items-center gap-2 text-xs text-zinc-500">
            <FolderOpen size={12} className="text-zinc-600 shrink-0" />
            <span className="font-mono truncate flex-1">{state.workspacePath}</span>
            <button
              onClick={() => client.shell.openPath(state.workspacePath!)}
              title="Open in Finder / Explorer"
              className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <ExternalLink size={11} />
            </button>

            <div className="relative shrink-0">
              <button
                onClick={() => setWsMenuOpen(o => !o)}
                className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Clock size={11} /> switch <ChevronDown size={10} />
              </button>

              {wsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setWsMenuOpen(false)} />
                  <div className="absolute right-0 top-6 z-50 w-72 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl py-1">
                    <p className="px-3 py-1.5 text-xs text-zinc-500 font-medium border-b border-zinc-800">Recent workspaces</p>
                    {recents.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-zinc-600">No recent workspaces yet</p>
                    ) : recents.map(p => (
                      <button
                        key={p}
                        onClick={() => handleSwitchWorkspace(p)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-800 transition-colors text-left ${
                          p === state.workspacePath ? 'text-indigo-400' : 'text-zinc-300'
                        }`}
                      >
                        <Folder size={11} className="shrink-0" />
                        <span className="font-mono truncate">{p}</span>
                        {p === state.workspacePath && <span className="ml-auto text-indigo-500">active</span>}
                      </button>
                    ))}
                    <div className="border-t border-zinc-800 mt-1 pt-1">
                      <button
                        onClick={handleBrowseWorkspace}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      >
                        <FolderOpen size={11} /> Browse for folder…
                      </button>
                      <button
                        onClick={() => { setWsMenuOpen(false); navigate('/settings') }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      >
                        Manage in Settings →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
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
            {quickSkills.map(skill => <QuickActionCard key={skill.id} skill={skill} />)}
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
                      {[project.hasLearnings && 'learnings', project.designs && 'designs']
                        .filter(Boolean).join(' · ') || 'no data yet'}
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
