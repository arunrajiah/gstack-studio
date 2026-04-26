import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play, Square, RotateCw, AlertTriangle, Folder, ChevronRight,
  Zap, FolderOpen, Clock, ChevronDown, ExternalLink,
  Search, GitBranch, Rocket, Activity, Lightbulb, HelpCircle, Globe
} from 'lucide-react'
import { useDaemon, useSkills, useRecentWorkspaces } from '../lib/store'
import { client, GStackProject } from '../lib/gstack-client'

const QUICK_ACTIONS = ['review', 'qa', 'ship', 'health', 'autoplan', 'cso']

const QUICK_ACTION_META: Record<string, { outcome: string; audience: string }> = {
  review:   { outcome: 'AI reviews your code for bugs and improvements', audience: 'anyone' },
  qa:       { outcome: 'Runs automated quality checks on your project',  audience: 'anyone' },
  ship:     { outcome: 'Prepares and publishes your changes',             audience: 'developers' },
  health:   { outcome: 'Checks the overall health of your codebase',      audience: 'anyone' },
  autoplan: { outcome: 'Creates a step-by-step plan for your next feature', audience: 'anyone' },
  cso:      { outcome: 'Optimises code for speed and efficiency',          audience: 'developers' },
}

const STARTER_TASKS = [
  { icon: Search,    label: 'Review my code',       desc: 'Get AI feedback on your latest changes',  skillId: 'review'   },
  { icon: Activity,  label: 'Check project health', desc: 'See a quick report on your codebase',      skillId: 'health'   },
  { icon: Lightbulb, label: 'Plan a new feature',   desc: 'Let AI create a step-by-step build plan',  skillId: 'autoplan' },
  { icon: GitBranch, label: 'Run quality checks',   desc: 'Automated tests and quality analysis',     skillId: 'qa'       },
  { icon: Rocket,    label: 'Ship my changes',      desc: 'Publish your work with one command',       skillId: 'ship'     },
]

export default function Dashboard() {
  const { state, loading, start, stop, restart } = useDaemon()
  const { skills } = useSkills()
  const { recents, switchTo } = useRecentWorkspaces()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<GStackProject[]>([])
  const [wsMenuOpen, setWsMenuOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

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
    try { await switchTo(path); await restart() }
    finally { setActionLoading(false) }
  }

  async function handleBrowseWorkspace() {
    const path = await client.workspace.browse()
    if (path) handleSwitchWorkspace(path)
  }

  const busy   = loading || actionLoading
  const isReady = !loading && state.running && !gstackMissing && !workspaceMissing

  return (
    <div className="page-enter p-6 max-w-4xl mx-auto space-y-5">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Your AI engineering team, ready to work</p>
      </div>

      {/* Setup banner */}
      {(gstackMissing || workspaceMissing) && (
        <div className="rounded-xl border border-amber-700/40 bg-gradient-to-b from-amber-950/20 to-amber-950/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
            <AlertTriangle size={14} /> Finish setup to get started
          </div>
          {gstackMissing && (
            <p className="text-xs text-zinc-400">
              The gstack agent library isn't configured yet.{' '}
              <button onClick={() => navigate('/settings')} className="text-amber-400 underline underline-offset-2">Go to Settings</button>
              {' '}to point Studio to your gstack installation, or install it automatically.
            </p>
          )}
          {workspaceMissing && (
            <p className="text-xs text-zinc-400">
              No project folder selected.{' '}
              <button onClick={() => navigate('/settings')} className="text-amber-400 underline underline-offset-2">Choose a folder in Settings</button>
              {' '}— this is where your code lives.
            </p>
          )}
        </div>
      )}

      {/* ── AI Browser hero card ─────────────────────────────────────── */}
      <div className={`relative rounded-2xl border overflow-hidden transition-all duration-500 ${
        state.running
          ? 'border-emerald-700/40 shadow-[0_0_32px_rgba(52,211,153,0.08)]'
          : 'border-zinc-200 dark:border-zinc-800'
      }`}>
        {/* Background gradient */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${
          state.running
            ? 'opacity-100 bg-gradient-to-br from-emerald-950/30 via-zinc-950/10 to-zinc-950'
            : 'opacity-100 bg-gradient-to-br from-zinc-100/80 to-zinc-50 dark:from-zinc-900 dark:to-zinc-950'
        }`} />

        <div className="relative p-5">
          <div className="flex items-center justify-between">
            {/* Status indicator + info */}
            <div className="flex items-center gap-4">
              {/* Animated status ring */}
              <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-all duration-500 ${
                busy          ? 'bg-yellow-500/10 border border-yellow-500/20' :
                state.running ? 'bg-emerald-500/10 border border-emerald-500/20 glow-green' :
                                'bg-zinc-200/60 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700'
              }`}>
                <Globe size={18} className={`transition-colors duration-300 ${
                  busy          ? 'text-yellow-400' :
                  state.running ? 'text-emerald-400' :
                                  'text-zinc-500'
                }`} />
                {state.running && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] border-2 border-zinc-950" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {busy ? 'Working…' : state.running ? 'AI Browser ready' : 'AI Browser offline'}
                  </p>
                  <span className="text-xs text-zinc-500 dark:text-zinc-600 font-mono">browse daemon</span>
                  <button
                    onClick={() => setShowHelp(h => !h)}
                    className="text-zinc-400 hover:text-zinc-500 transition-colors"
                    title="What is the AI Browser?"
                  >
                    <HelpCircle size={13} />
                  </button>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {state.running
                    ? `Port ${state.port} · PID ${state.pid} — agents can navigate and read websites`
                    : 'Start the AI Browser so agents can access the web'}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {state.running ? (
                <>
                  <button
                    onClick={restart}
                    disabled={busy}
                    className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-all shadow-sm"
                  >
                    <RotateCw size={12} className={busy ? 'animate-spin' : ''} />
                    Restart
                  </button>
                  <button
                    onClick={stop}
                    disabled={busy}
                    className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-800/50 bg-red-950/20 hover:bg-red-950/40 disabled:opacity-40 text-xs font-medium text-red-400 transition-all"
                  >
                    <Square size={12} />
                    Stop
                  </button>
                </>
              ) : (
                <button
                  onClick={start}
                  disabled={busy || gstackMissing || workspaceMissing}
                  className="btn-press flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-all shadow-sm shadow-indigo-900/30"
                >
                  <Play size={13} />
                  {busy ? 'Starting…' : 'Start AI Browser'}
                </button>
              )}
            </div>
          </div>

          {/* Help tooltip */}
          {showHelp && (
            <div className="mt-4 p-3 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 border border-zinc-300/60 dark:border-zinc-700/60 text-xs text-zinc-500 leading-relaxed">
              The AI Browser is a background service that lets AI agents open websites, read content, fill forms, and take screenshots — all automatically. Start it before running any agent that needs web access.
            </div>
          )}

          {/* Workspace row */}
          {state.workspacePath && (
            <div className="mt-4 pt-4 border-t border-zinc-200/40 dark:border-zinc-800/40 flex items-center gap-2 text-xs text-zinc-500">
              <FolderOpen size={12} className="text-zinc-500 shrink-0" />
              <span className="font-mono truncate flex-1 text-zinc-600 dark:text-zinc-400">{state.workspacePath}</span>
              <button
                onClick={() => client.shell.openPath(state.workspacePath!)}
                title="Open in Finder / Explorer"
                className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-0.5 rounded"
              >
                <ExternalLink size={11} />
              </button>
              <div className="relative shrink-0">
                <button
                  onClick={() => setWsMenuOpen(o => !o)}
                  className="flex items-center gap-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <Clock size={11} /> switch <ChevronDown size={10} />
                </button>
                {wsMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setWsMenuOpen(false)} />
                    <div className="absolute right-0 top-6 z-50 w-72 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl py-1 overflow-hidden">
                      <p className="px-3 py-1.5 text-xs text-zinc-400 font-semibold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">Recent projects</p>
                      {recents.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-zinc-500">No recent projects yet</p>
                      ) : recents.map(p => (
                        <button
                          key={p}
                          onClick={() => handleSwitchWorkspace(p)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left ${
                            p === state.workspacePath ? 'text-indigo-500' : 'text-zinc-600 dark:text-zinc-300'
                          }`}
                        >
                          <Folder size={11} className="shrink-0" />
                          <span className="font-mono truncate">{p}</span>
                          {p === state.workspacePath && <span className="ml-auto text-indigo-400 font-medium">active</span>}
                        </button>
                      ))}
                      <div className="border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1">
                        <button onClick={handleBrowseWorkspace} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                          <FolderOpen size={11} /> Browse for folder…
                        </button>
                        <button onClick={() => { setWsMenuOpen(false); navigate('/settings') }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
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
      </div>

      {/* "What would you like to do?" — when offline */}
      {!state.running && !loading && !gstackMissing && !workspaceMissing && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            <Lightbulb size={14} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">What would you like to do today?</h2>
          </div>
          <div className="p-3 space-y-1">
            {STARTER_TASKS.map(task => {
              const Icon = task.icon
              return (
                <button
                  key={task.skillId}
                  onClick={() => navigate('/sprint')}
                  className="btn-press w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/60 transition-colors">
                    <Icon size={14} className="text-indigo-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{task.label}</p>
                    <p className="text-xs text-zinc-400 truncate">{task.desc}</p>
                  </div>
                  <ChevronRight size={13} className="text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-400 shrink-0 transition-colors" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      {quickSkills.length > 0 && isReady && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Quick Actions</h2>
            <span className="text-xs text-zinc-400">— click to copy command</span>
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
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Projects</h2>
            <span className="text-xs text-zinc-400">— AI memory from past sessions</span>
          </div>
          <div className="space-y-1.5">
            {projects.map(project => (
              <button
                key={project.slug}
                onClick={() => navigate('/history', { state: { slug: project.slug } })}
                className="card-lift w-full flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                    <Folder size={14} className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{project.slug}</p>
                    <p className="text-xs text-zinc-400">
                      {[project.hasLearnings && 'AI learnings saved', project.designs && 'designs']
                        .filter(Boolean).join(' · ') || 'no history yet'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-400 shrink-0 transition-colors" />
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
  const meta = QUICK_ACTION_META[skill.id]

  async function handleCopy() {
    await client.copyCommand(skill.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      onClick={handleCopy}
      className="card-lift flex flex-col gap-2 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-left group"
    >
      <div className="flex items-center justify-between">
        <span className="text-lg leading-none">{skill.icon}</span>
        {meta?.audience === 'anyone' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400">everyone</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{skill.name}</p>
        {meta?.outcome && (
          <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{meta.outcome}</p>
        )}
        <p className={`text-xs mt-2 font-mono transition-colors ${
          copied ? 'text-emerald-500' : 'text-zinc-400 dark:text-zinc-600'
        }`}>
          {copied ? '✓ Copied!' : `/${skill.id}`}
        </p>
      </div>
    </button>
  )
}
