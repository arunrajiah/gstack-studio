import { useState, useEffect } from 'react'
import { CheckCircle2, FolderOpen, ExternalLink, ChevronRight, Zap } from 'lucide-react'
import { client, AppConfig } from '../lib/gstack-client'

interface Props {
  onComplete: (config: Partial<AppConfig>) => void
}

type Step = 'welcome' | 'configure' | 'done'

const DEFAULT_GSTACK_PATHS = [
  `${navigator.platform.includes('Win') ? 'C:\\Users\\<you>' : '~'}/.claude/skills/gstack`,
  `${navigator.platform.includes('Win') ? 'C:\\Users\\<you>' : '~'}/.gstack/skills/gstack`
]

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('welcome')
  const [gstackPath, setGstackPath] = useState('')
  const [workspacePath, setWorkspacePath] = useState('')
  const [autoDetected, setAutoDetected] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load any already-saved partial config
  useEffect(() => {
    client.config.get().then(cfg => {
      if (cfg.gstackPath)    { setGstackPath(cfg.gstackPath);    setAutoDetected(true) }
      if (cfg.workspacePath) setWorkspacePath(cfg.workspacePath)
    }).catch(() => {})
  }, [])

  async function browsePath(field: 'gstack' | 'workspace') {
    const path = await client.workspace.browse()
    if (!path) return
    if (field === 'gstack')    setGstackPath(path)
    if (field === 'workspace') setWorkspacePath(path)
  }

  async function handleFinish() {
    setSaving(true)
    const updates: Partial<AppConfig> = {}
    if (gstackPath)    updates.gstackPath    = gstackPath
    if (workspacePath) updates.workspacePath = workspacePath
    if (workspacePath) {
      const recents = await client.workspace.recents()
      updates.recentWorkspaces = [workspacePath, ...recents.filter(p => p !== workspacePath)].slice(0, 5)
    }
    await client.config.set(updates)
    onComplete(updates)
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* Progress dots */}
        <div className="flex gap-1.5 px-6 pt-5">
          {(['welcome','configure','done'] as Step[]).map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
              s === step ? 'bg-indigo-500' :
              (step === 'configure' && s === 'welcome') || step === 'done' ? 'bg-indigo-800' :
              'bg-zinc-800'
            }`} />
          ))}
        </div>

        {/* ── Step 1: Welcome ─────────────────────────────────────────────── */}
        {step === 'welcome' && (
          <div className="p-6 space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-indigo-400">gstack</span>
                <span className="text-2xl font-bold text-zinc-200">Studio</span>
              </div>
              <p className="text-sm text-zinc-400">Visual command centre for the gstack AI agent framework</p>
            </div>

            <div className="space-y-3">
              {[
                { icon: '🗺️', title: 'Sprint Board',    desc: 'Browse all 23 AI agents and copy slash commands instantly' },
                { icon: '🤖', title: 'Agents',          desc: 'Search skills and stream live daemon output' },
                { icon: '🌐', title: 'Browse Console',  desc: 'Send HTTP commands to the gstack browse daemon' },
                { icon: '📖', title: 'History',         desc: 'Review per-project learnings with search' },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/50">
                  <span className="text-lg">{f.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{f.title}</p>
                    <p className="text-xs text-zinc-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-xs text-zinc-400 space-y-1">
              <p className="font-medium text-amber-300">Prerequisites</p>
              <p>• <a onClick={() => client.shell.openUrl('https://github.com/garrytan/gstack')} className="text-indigo-400 cursor-pointer hover:underline">gstack</a> installed at <code className="font-mono text-zinc-300">~/.claude/skills/gstack</code></p>
              <p>• <a onClick={() => client.shell.openUrl('https://bun.sh')} className="text-indigo-400 cursor-pointer hover:underline">Bun</a> for running the browse daemon</p>
            </div>

            <button
              onClick={() => setStep('configure')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors"
            >
              Let's get started <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* ── Step 2: Configure ────────────────────────────────────────────── */}
        {step === 'configure' && (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Configure your setup</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Tell Studio where gstack is installed and which project to work in</p>
            </div>

            <div className="space-y-4">
              {/* gstack path */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">
                  gstack Install Path <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-zinc-500">Default: <code className="font-mono text-zinc-400">~/.claude/skills/gstack</code></p>
                <div className="flex gap-2">
                  <input
                    value={gstackPath}
                    onChange={e => setGstackPath(e.target.value)}
                    placeholder={DEFAULT_GSTACK_PATHS[0]}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => browsePath('gstack')}
                    className="px-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <FolderOpen size={15} />
                  </button>
                </div>
                {autoDetected && <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={11} /> Auto-detected from previous session</p>}
              </div>

              {/* Workspace path */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">
                  Workspace Directory <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-zinc-500">Your project folder — daemon writes <code className="font-mono text-zinc-400">.gstack/browse.json</code> here</p>
                <div className="flex gap-2">
                  <input
                    value={workspacePath}
                    onChange={e => setWorkspacePath(e.target.value)}
                    placeholder="/Users/you/my-project"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => browsePath('workspace')}
                    className="px-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <FolderOpen size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('welcome')}
                className="px-4 py-2 rounded-xl border border-zinc-800 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('done')}
                disabled={!gstackPath.trim() || !workspacePath.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Continue <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ─────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center">
                <Zap size={22} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-100">You're all set!</h2>
                <p className="text-xs text-zinc-500 mt-1">Studio will start the daemon and take you to the Dashboard</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-800/50">
                <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-zinc-300 font-medium">gstack path</p>
                  <p className="text-zinc-500 font-mono truncate">{gstackPath}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-800/50">
                <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-zinc-300 font-medium">Workspace</p>
                  <p className="text-zinc-500 font-mono truncate">{workspacePath}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('configure')}
                className="px-4 py-2 rounded-xl border border-zinc-800 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                <ExternalLink size={13} />
                {saving ? 'Saving…' : 'Open Dashboard'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
