import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, FolderOpen, ExternalLink, ChevronRight, Zap,
  Download, AlertCircle, Loader2, Search, GitBranch, Globe,
  BookOpen, RefreshCw, Terminal,
} from 'lucide-react'
import { client, AppConfig } from '../lib/gstack-client'

interface Props {
  onComplete: (config: Partial<AppConfig>) => void
}

type Step = 'welcome' | 'configure' | 'done'
type InstallState = 'idle' | 'installing' | 'success' | 'error'
type CheckState = boolean | null   // null = checking, true = found, false = missing

const DEFAULT_GSTACK_PATH = '~/.claude/skills/gstack'

const FEATURES = [
  { icon: Search,    title: 'Find the right AI agent',    desc: 'Browse 70+ agents organised by what you want to do — review code, plan a feature, ship a release, and more.', color: 'text-violet-400 bg-violet-950/30' },
  { icon: GitBranch, title: 'Run agents in one click',    desc: 'Click ▶ on any agent to open it in your AI coding tool — no terminal commands to remember.',                  color: 'text-cyan-400 bg-cyan-950/30' },
  { icon: Globe,     title: 'Web browser for AI',         desc: 'Give AI agents the ability to open websites, read content, and fill forms — all controlled from here.',        color: 'text-emerald-400 bg-emerald-950/30' },
  { icon: BookOpen,  title: 'Project memory',             desc: 'Every agent session saves what it learned. Review the AI\'s notes from past sessions anytime.',               color: 'text-amber-400 bg-amber-950/30' },
]

/** Detect the current OS from the user-agent string (renderer-safe). */
function detectOS(): 'win' | 'mac' | 'linux' {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('win')) return 'win'
  if (ua.includes('mac')) return 'mac'
  return 'linux'
}

// ── Small helper components ───────────────────────────────────────────────────

function StatusBadge({ state }: { state: CheckState }) {
  if (state === null) return (
    <span className="flex items-center gap-1 text-xs text-zinc-500">
      <Loader2 size={11} className="animate-spin" /> checking…
    </span>
  )
  if (state) return (
    <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
      <CheckCircle2 size={11} /> Ready
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
      <AlertCircle size={11} /> Not installed
    </span>
  )
}

function GitGuide({ os }: { os: 'win' | 'mac' | 'linux' }) {
  if (os === 'win') return (
    <div className="mt-2 space-y-2 text-xs text-zinc-500">
      <p>Git is needed to auto-install gstack. Two easy ways to get it:</p>
      <div className="space-y-1.5">
        <button
          onClick={() => client.shell.openUrl('https://git-scm.com/download/win')}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
        >
          <Download size={12} /> Download Git for Windows
        </button>
        <p className="text-zinc-600 text-center text-xs">or run in Command Prompt / PowerShell:</p>
        <code className="block font-mono text-zinc-400 bg-zinc-900/60 px-2 py-1.5 rounded-lg border border-zinc-800 text-xs">
          winget install --id Git.Git -e
        </code>
      </div>
    </div>
  )
  if (os === 'mac') return (
    <div className="mt-2 space-y-2 text-xs text-zinc-500">
      <p>Run this in Terminal — macOS will prompt you to install git automatically:</p>
      <code className="block font-mono text-zinc-400 bg-zinc-900/60 px-2 py-1.5 rounded-lg border border-zinc-800 text-xs">
        git --version
      </code>
      <p className="text-zinc-600">Or install via Homebrew: <code className="font-mono text-zinc-500">brew install git</code></p>
    </div>
  )
  return (
    <div className="mt-2 space-y-2 text-xs text-zinc-500">
      <p>Install git using your package manager:</p>
      <code className="block font-mono text-zinc-400 bg-zinc-900/60 px-2 py-1.5 rounded-lg border border-zinc-800 text-xs">
        sudo apt install git   # Ubuntu / Debian
      </code>
      <code className="block font-mono text-zinc-400 bg-zinc-900/60 px-2 py-1.5 rounded-lg border border-zinc-800 text-xs">
        sudo dnf install git   # Fedora / RHEL
      </code>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }: Props) {
  const os = detectOS()
  const [step, setStep] = useState<Step>('welcome')

  // gstack setup state
  const [gstackPath, setGstackPath]     = useState('')
  const [workspacePath, setWorkspacePath] = useState('')
  const [autoDetected, setAutoDetected]   = useState(false)
  const [saving, setSaving]               = useState(false)
  const [gstackFound, setGstackFound]     = useState<boolean | null>(null)
  const [gstackInstallState, setGstackInstallState] = useState<InstallState>('idle')
  const [gstackInstallError, setGstackInstallError] = useState('')

  // Dependency check states
  const [bunFound, setBunFound]           = useState<CheckState>(null)
  const [gitFound, setGitFound]           = useState<CheckState>(null)
  const [bunInstallState, setBunInstallState] = useState<InstallState>('idle')
  const [bunInstallError, setBunInstallError] = useState('')

  // ── Checks ────────────────────────────────────────────────────────────────

  const recheckBun = useCallback(() => {
    setBunFound(null)
    client.checkBun().then(r => setBunFound(r.found)).catch(() => setBunFound(false))
  }, [])

  const recheckGit = useCallback(() => {
    setGitFound(null)
    client.checkGit().then(r => setGitFound(r.found)).catch(() => setGitFound(false))
  }, [])

  useEffect(() => {
    // Load saved config
    client.config.get().then(cfg => {
      if (cfg.gstackPath) { setGstackPath(cfg.gstackPath); setAutoDetected(true) }
      if (cfg.workspacePath) setWorkspacePath(cfg.workspacePath)
    }).catch(() => {})

    recheckBun()
    recheckGit()
  }, [recheckBun, recheckGit])

  // Debounced gstack path check
  useEffect(() => {
    if (!gstackPath.trim()) { setGstackFound(null); return }
    setGstackFound(null)
    const t = setTimeout(async () => {
      try { setGstackFound(await client.checkGstack(gstackPath.trim())) }
      catch { setGstackFound(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [gstackPath])

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleInstallBun() {
    setBunInstallState('installing')
    setBunInstallError('')
    try {
      const result = await client.installBun()
      if (result.success) {
        setBunInstallState('success')
        // Re-check file system — no restart needed, installer writes to ~/.bun/bin/bun
        recheckBun()
      } else {
        setBunInstallError(result.error ?? 'Install failed')
        setBunInstallState('error')
      }
    } catch (err) {
      setBunInstallError(String(err))
      setBunInstallState('error')
    }
  }

  async function handleInstallGstack() {
    const targetPath = gstackPath.trim() || DEFAULT_GSTACK_PATH
    setGstackInstallError('')
    setGstackInstallState('installing')
    try {
      const result = await client.installGstack(targetPath)
      if (result.success) {
        setGstackPath(result.path)
        setGstackFound(true)
        setGstackInstallState('success')
      } else {
        setGstackInstallError(result.error ?? 'Installation failed')
        setGstackInstallState('error')
      }
    } catch (err) {
      setGstackInstallError(String(err))
      setGstackInstallState('error')
    }
  }

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

  const canContinue = gstackPath.trim() && workspacePath.trim() && gstackInstallState !== 'installing'
  const allReady    = bunFound === true && gitFound === true

  return (
    <div className="fixed inset-0 z-50 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="flex gap-1.5 px-6 pt-5">
          {(['welcome','configure','done'] as Step[]).map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
              s === step ? 'bg-indigo-500' :
              (step === 'configure' && s === 'welcome') || step === 'done' ? 'bg-indigo-800' :
              'bg-zinc-200 dark:bg-zinc-800'
            }`} />
          ))}
        </div>

        {/* ── Step 1: Welcome ──────────────────────────────────────────────── */}
        {step === 'welcome' && (
          <div className="p-6 space-y-5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-indigo-400">gstack</span>
                <span className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">Studio</span>
              </div>
              <p className="text-sm text-zinc-400">Your visual control panel for AI engineering agents</p>
            </div>

            {/* Features */}
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

            {/* ── System requirements panel ─────────────────────────────── */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-sm">
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800">
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">System requirements</p>
                <button
                  onClick={() => { recheckBun(); recheckGit() }}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <RefreshCw size={10} /> Re-check
                </button>
              </div>

              {/* Bun row */}
              <div className="px-3 py-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Terminal size={13} className="text-zinc-500 shrink-0" />
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">Bun</span>
                    </div>
                    <p className="text-xs text-zinc-500 ml-[21px] mt-0.5">JavaScript runtime — runs the AI browser service</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge state={bunFound} />
                    {bunFound === false && bunInstallState !== 'installing' && bunInstallState !== 'success' && (
                      <button
                        onClick={handleInstallBun}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                      >
                        <Download size={11} /> Install
                      </button>
                    )}
                  </div>
                </div>

                {/* Bun installing */}
                {bunInstallState === 'installing' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 text-xs text-zinc-400">
                    <Loader2 size={12} className="animate-spin text-indigo-400 shrink-0" />
                    <span>Installing Bun — downloading and setting up, this takes about 30 seconds…</span>
                  </div>
                )}

                {/* Bun install success (before re-check completes) */}
                {bunInstallState === 'success' && bunFound !== true && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-800/30 text-xs text-emerald-400">
                    <CheckCircle2 size={12} className="shrink-0" />
                    Bun installed — verifying…
                  </div>
                )}

                {/* Bun install error */}
                {bunInstallState === 'error' && bunInstallError && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-950/20 border border-red-900/30 text-xs text-red-400">
                      <AlertCircle size={12} className="shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium">Install failed</p>
                        <p className="text-red-400/70 break-words mt-0.5">{bunInstallError}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleInstallBun}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
                      >
                        <RefreshCw size={10} /> Try again
                      </button>
                      <button
                        onClick={() => client.shell.openUrl('https://bun.sh')}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:underline"
                      >
                        <ExternalLink size={10} /> Manual install at bun.sh
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* git row */}
              <div className="px-3 py-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <GitBranch size={13} className="text-zinc-500 shrink-0" />
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">Git</span>
                    </div>
                    <p className="text-xs text-zinc-500 ml-[21px] mt-0.5">Used to auto-install the gstack agent library</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge state={gitFound} />
                    {gitFound === false && (
                      <button
                        onClick={() => {
                          const url = os === 'win'
                            ? 'https://git-scm.com/download/win'
                            : os === 'mac'
                            ? 'https://git-scm.com/download/mac'
                            : 'https://git-scm.com/download/linux'
                          client.shell.openUrl(url)
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors"
                      >
                        <ExternalLink size={10} /> Get Git
                      </button>
                    )}
                  </div>
                </div>

                {/* Git install instructions when missing */}
                {gitFound === false && <GitGuide os={os} />}
              </div>

              {/* All ready summary */}
              {allReady && (
                <div className="px-3 py-2.5 bg-emerald-950/20 border-t border-emerald-800/20 flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 size={12} className="shrink-0" />
                  All requirements met — you're good to go!
                </div>
              )}
            </div>

            <button
              onClick={() => setStep('configure')}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                allReady
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {allReady ? <>Get started <ChevronRight size={14} /></> : <>Continue anyway <ChevronRight size={14} /></>}
            </button>
            {!allReady && (
              <p className="text-center text-xs text-zinc-600">
                You can skip missing requirements and install them later
              </p>
            )}
          </div>
        )}

        {/* ── Step 2: Configure ────────────────────────────────────────────── */}
        {step === 'configure' && (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Two quick things to set up</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Tell Studio where gstack lives and which project you're working on</p>
            </div>

            {/* Carry-over warnings for unmet deps */}
            {(bunFound === false || gitFound === false) && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-300">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Some requirements aren't installed yet</p>
                  <p className="text-amber-300/70 mt-0.5">
                    {bunFound === false && 'Bun is needed for the AI browser service. '}
                    {gitFound === false && 'Git is needed for auto-installing gstack. '}
                    Go <button onClick={() => setStep('welcome')} className="underline text-amber-300">back</button> to install them.
                  </p>
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
                  gstack is the AI agent library. Default: <code className="font-mono text-zinc-400">~/.claude/skills/gstack</code>
                </p>
                <div className="flex gap-2">
                  <input
                    value={gstackPath}
                    onChange={e => { setGstackPath(e.target.value); setGstackInstallState('idle'); setGstackInstallError('') }}
                    placeholder={DEFAULT_GSTACK_PATH}
                    className="flex-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                  <button type="button" onClick={() => browsePath('gstack')} title="Browse"
                    className="px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                    <FolderOpen size={15} />
                  </button>
                </div>

                {/* Status */}
                {autoDetected && gstackFound !== false && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={11} /> Found from last session</p>
                )}
                {gstackPath.trim() && gstackFound === true && !autoDetected && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={11} /> gstack found</p>
                )}
                {gstackInstallState === 'success' && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={11} /> Installed successfully</p>
                )}

                {/* Auto-install panel */}
                {((!gstackPath.trim() && gstackInstallState === 'idle') ||
                  (gstackFound === false && gstackInstallState !== 'success')) && (
                  <div className="mt-2 p-3 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 space-y-2">
                    {(gstackInstallState === 'idle' || gstackInstallState === 'error') && (
                      <>
                        <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                          <AlertCircle size={12} className="text-amber-400 shrink-0" />
                          {gstackFound === false
                            ? "gstack wasn't found at that path."
                            : "gstack isn't set up yet — no problem, we can install it for you."}
                        </p>
                        {gstackInstallState === 'error' && gstackInstallError && (
                          <p className="text-xs text-red-400 break-words">{gstackInstallError}</p>
                        )}
                        <button
                          onClick={handleInstallGstack}
                          disabled={!gitFound}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-white transition-colors"
                        >
                          <Download size={12} />
                          {gstackInstallState === 'error' ? 'Try again' : 'Install gstack automatically'}
                          <span className="text-indigo-300 ml-1 font-normal">→ {gstackPath.trim() || DEFAULT_GSTACK_PATH}</span>
                        </button>
                        {!gitFound && (
                          <p className="text-xs text-amber-400/80 flex items-center gap-1">
                            <AlertCircle size={10} /> Git is required to install gstack — go back to install it first
                          </p>
                        )}
                      </>
                    )}
                    {gstackInstallState === 'installing' && (
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Loader2 size={13} className="animate-spin text-indigo-400 shrink-0" />
                        Cloning gstack from GitHub — takes about 30 seconds…
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Workspace path */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Which project folder are you working on? <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-zinc-500">The folder where your code lives. AI agents will run inside this folder.</p>
                <div className="flex gap-2">
                  <input
                    value={workspacePath}
                    onChange={e => setWorkspacePath(e.target.value)}
                    placeholder="/Users/you/my-project"
                    className="flex-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-600 transition-colors"
                  />
                  <button type="button" onClick={() => browsePath('workspace')} title="Browse"
                    className="px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                    <FolderOpen size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('welcome')}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                Back
              </button>
              <button onClick={() => setStep('done')} disabled={!canContinue}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors">
                {gstackInstallState === 'installing'
                  ? <><Loader2 size={13} className="animate-spin" /> Installing…</>
                  : <>Continue <ChevronRight size={14} /></>}
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
                <p className="text-xs text-zinc-500 mt-1">gstack Studio is configured and ready to go</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50">
                <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-zinc-700 dark:text-zinc-300 font-medium">Agent library</p>
                  <p className="text-zinc-500 font-mono truncate">{gstackPath}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50">
                <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
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
              <button onClick={() => setStep('configure')}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                Back
              </button>
              <button onClick={handleFinish} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium transition-colors">
                <Zap size={13} />
                {saving ? 'Saving…' : 'Open Dashboard'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
