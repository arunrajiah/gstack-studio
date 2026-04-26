import { useState, useEffect } from 'react'
import {
  CheckCircle2, FolderOpen, ExternalLink, ChevronRight, Zap,
  Download, AlertCircle, Loader2, Search, GitBranch, Globe, BookOpen
} from 'lucide-react'
import { client, AppConfig } from '../lib/gstack-client'

interface Props {
  onComplete: (config: Partial<AppConfig>) => void
}

type Step = 'welcome' | 'configure' | 'done'
type InstallState = 'idle' | 'checking' | 'installing' | 'success' | 'error'

const DEFAULT_GSTACK_PATH = '~/.claude/skills/gstack'

const FEATURES = [
  {
    icon: Search,
    title: 'Find the right AI agent',
    desc: 'Browse 70+ agents organised by what you want to do — review code, plan a feature, ship a release, and more.',
    color: 'text-violet-400 bg-violet-950/30',
  },
  {
    icon: GitBranch,
    title: 'Run agents in one click',
    desc: 'Click ▶ on any agent to open it in your AI coding tool, no terminal commands to remember.',
    color: 'text-cyan-400 bg-cyan-950/30',
  },
  {
    icon: Globe,
    title: 'Web browser for AI',
    desc: 'Give AI agents the ability to open websites, read content, and fill forms — all controlled from here.',
    color: 'text-emerald-400 bg-emerald-950/30',
  },
  {
    icon: BookOpen,
    title: 'Project memory',
    desc: 'Every agent session saves what it learned. Review the AI\'s notes from past sessions anytime.',
    color: 'text-amber-400 bg-amber-950/30',
  },
]

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('welcome')
  const [gstackPath, setGstackPath] = useState('')
  const [workspacePath, setWorkspacePath] = useState('')
  const [autoDetected, setAutoDetected] = useState(false)
  const [saving, setSaving] = useState(false)

  // gstack install state
  const [installState, setInstallState] = useState<InstallState>('idle')
  const [installError, setInstallError] = useState('')
  const [gstackFound, setGstackFound] = useState<boolean | null>(null)

  // Bun presence
  const [bunFound, setBunFound] = useState<boolean | null>(null)

  // Load any already-saved partial config + check Bun on mount
  useEffect(() => {
    client.config.get().then(cfg => {
      if (cfg.gstackPath) { setGstackPath(cfg.gstackPath); setAutoDetected(true) }
      if (cfg.workspacePath) setWorkspacePath(cfg.workspacePath)
    }).catch(() => {})

    client.checkBun().then(r => setBunFound(r.found)).catch(() => setBunFound(false))
  }, [])

  // Check whether the currently-typed gstack path actually exists
  useEffect(() => {
    if (!gstackPath.trim()) { setGstackFound(null); return }
    setGstackFound(null)
    const timer = setTimeout(async () => {
      try {
        const found = await client.checkGstack(gstackPath.trim())
        setGstackFound(found)
      } catch { setGstackFound(false) }
    }, 400)
    return () => clearTimeout(timer)
  }, [gstackPath])

  async function browsePath(field: 'gstack' | 'workspace') {
    const path = await client.workspace.browse()
    if (!path) return
    if (field === 'gstack')    setGstackPath(path)
    if (field === 'workspace') setWorkspacePath(path)
  }

  async function handleInstall() {
    const targetPath = gstackPath.trim() || DEFAULT_GSTACK_PATH
    setInstallError('')
    setInstallState('installing')
    try {
      const result = await client.installGstack(targetPath)
      if (result.success) {
        setGstackPath(result.path)
        setGstackFound(true)
        setInstallState('success')
      } else {
        setInstallError(result.error ?? 'Installation failed')
        setInstallState('error')
      }
    } catch (err) {
      setInstallError(String(err))
      setInstallState('error')
    }
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

  const canContinue = gstackPath.trim() && workspacePath.trim() && installState !== 'installing'

  return (
    <div className="fixed inset-0 z-50 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* Progress dots */}
        <div className="flex gap-1.5 px-6 pt-5">
          {(['welcome','configure','done'] as Step[]).map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
              s === step ? 'bg-indigo-500' :
              (step === 'configure' && s === 'welcome') || step === 'done' ? 'bg-indigo-800' :
              'bg-zinc-200 dark:bg-zinc-800'
            }`} />
          ))}
        </div>

        {/* ── Step 1: Welcome ─────────────────────────────────────────────── */}
        {step === 'welcome' && (
          <div className="p-6 space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-indigo-400">gstack</span>
                <span className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">Studio</span>
              </div>
              <p className="text-sm text-zinc-400">Your visual control panel for AI engineering agents</p>
            </div>

            <div className="space-y-2">
              {FEATURES.map(f => {
                const Icon = f.icon
                return (
                  <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${f.color}`}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{f.title}</p>
                      <p className="text-xs text-zinc-500 leading-snug mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Prerequisites check */}
            <div className="bg-zinc-200/60 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 rounded-xl p-3 text-xs space-y-2">
              <p className="font-medium text-zinc-700 dark:text-zinc-300">Quick system check</p>

              {/* Bun status */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-zinc-600 dark:text-zinc-400">Bun runtime </span>
                  <span className="text-zinc-500">(needed to run the AI browser service)</span>
                </div>
                {bunFound === null ? (
                  <span className="text-zinc-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> checking…</span>
                ) : bunFound ? (
                  <span className="text-emerald-400 flex items-center gap-1 shrink-0"><CheckCircle2 size={11} /> ready</span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1 shrink-0"><AlertCircle size={11} /> missing</span>
                )}
              </div>

              {/* Bun missing — show install steps clearly */}
              {bunFound === false && (
                <div className="pt-1 space-y-1.5 border-t border-zinc-300 dark:border-zinc-700">
                  <p className="text-zinc-500">Install Bun first (takes about 30 seconds):</p>
                  <code className="block font-mono text-zinc-300 bg-zinc-900/50 px-2 py-1.5 rounded-lg">
                    curl -fsSL https://bun.sh/install | bash
                  </code>
                  <button
                    onClick={() => client.shell.openUrl('https://bun.sh')}
                    className="flex items-center gap-1 text-indigo-400 hover:underline"
                  >
                    <ExternalLink size={10} /> Open bun.sh for instructions
                  </button>
                  <p className="text-zinc-600">Once installed, restart this app and the check will pass.</p>
                </div>
              )}

              <p className="text-zinc-600">
                The gstack agent library can be installed automatically in the next step.
              </p>
            </div>

            <button
              onClick={() => setStep('configure')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors"
            >
              Get started <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* ── Step 2: Configure ────────────────────────────────────────────── */}
        {step === 'configure' && (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Two quick things to set up</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Tell Studio where gstack lives and which project you're working on</p>
            </div>

            {/* Bun missing warning */}
            {bunFound === false && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-950/20 border border-red-800/40 text-xs text-red-400">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-medium">Bun isn't installed yet</p>
                  <p className="text-red-400/70">The AI browser service needs Bun to run. Install it to continue:</p>
                  <code className="font-mono text-zinc-300 block mt-1 bg-zinc-900/40 px-2 py-1 rounded">curl -fsSL https://bun.sh/install | bash</code>
                  <button
                    onClick={() => client.shell.openUrl('https://bun.sh')}
                    className="text-indigo-400 hover:underline mt-1 flex items-center gap-1 block"
                  >
                    <ExternalLink size={10} /> bun.sh
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* gstack path */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Where is gstack installed? <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-zinc-500">
                  gstack is the AI agent library. Default location:{' '}
                  <code className="font-mono text-zinc-400">~/.claude/skills/gstack</code>
                </p>
                <div className="flex gap-2">
                  <input
                    value={gstackPath}
                    onChange={e => { setGstackPath(e.target.value); setInstallState('idle'); setInstallError('') }}
                    placeholder={DEFAULT_GSTACK_PATH}
                    className="flex-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => browsePath('gstack')}
                    title="Browse for folder"
                    className="px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  >
                    <FolderOpen size={15} />
                  </button>
                </div>

                {/* Status feedback */}
                {autoDetected && gstackFound !== false && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Found from last session
                  </p>
                )}
                {gstackPath.trim() && gstackFound === true && !autoDetected && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={11} /> gstack found
                  </p>
                )}

                {/* Install panel */}
                {((!gstackPath.trim() && installState === 'idle') ||
                  (gstackFound === false && installState !== 'success')) && (
                  <div className="mt-2 p-3 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 space-y-2">
                    {installState === 'idle' || installState === 'checking' ? (
                      <>
                        <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                          <AlertCircle size={12} className="text-amber-400 shrink-0" />
                          {gstackFound === false
                            ? 'gstack wasn\'t found at that path.'
                            : 'gstack isn\'t set up yet — no problem, we can install it for you.'}
                        </p>
                        <button
                          onClick={handleInstall}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors"
                        >
                          <Download size={12} />
                          Install gstack automatically
                          <span className="text-indigo-300 ml-1 font-normal">
                            → {gstackPath.trim() || DEFAULT_GSTACK_PATH}
                          </span>
                        </button>
                      </>
                    ) : installState === 'installing' ? (
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Loader2 size={13} className="animate-spin text-indigo-400 shrink-0" />
                        <span>Installing gstack — downloading from GitHub, this takes about 30 seconds…</span>
                      </div>
                    ) : installState === 'error' ? (
                      <>
                        <p className="text-xs text-red-400 flex items-start gap-1.5">
                          <AlertCircle size={12} className="shrink-0 mt-0.5" />
                          {installError || 'Installation failed. Check your internet connection and try again.'}
                        </p>
                        <button
                          onClick={handleInstall}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-zinc-600 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-400 transition-colors"
                        >
                          Try again
                        </button>
                      </>
                    ) : null}
                  </div>
                )}

                {installState === 'success' && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={11} /> gstack installed successfully
                  </p>
                )}
              </div>

              {/* Workspace path */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Which project folder are you working on? <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-zinc-500">
                  This is the folder where your code lives. AI agents will run inside this folder.
                </p>
                <div className="flex gap-2">
                  <input
                    value={workspacePath}
                    onChange={e => setWorkspacePath(e.target.value)}
                    placeholder="/Users/you/my-project"
                    className="flex-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => browsePath('workspace')}
                    title="Browse for folder"
                    className="px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  >
                    <FolderOpen size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('welcome')}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('done')}
                disabled={!canContinue}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {installState === 'installing' ? (
                  <><Loader2 size={13} className="animate-spin" /> Installing…</>
                ) : (
                  <>Continue <ChevronRight size={14} /></>
                )}
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
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">You're all set!</h2>
                <p className="text-xs text-zinc-500 mt-1">gstack Studio will start your AI browser and take you to the dashboard</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50">
                <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-zinc-700 dark:text-zinc-300 font-medium">Agent library</p>
                  <p className="text-zinc-500 font-mono truncate">{gstackPath}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50">
                <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-zinc-700 dark:text-zinc-300 font-medium">Project folder</p>
                  <p className="text-zinc-500 font-mono truncate">{workspacePath}</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-800/30 text-xs text-zinc-400 space-y-1">
              <p className="font-medium text-indigo-300">What happens next</p>
              <p>You'll land on the Dashboard. Click <strong className="text-zinc-300">Start AI Browser</strong> to activate web browsing for agents, then head to the <strong className="text-zinc-300">Agent Board</strong> to pick your first task.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('configure')}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
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
