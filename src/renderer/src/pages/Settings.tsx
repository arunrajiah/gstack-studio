import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle2, FolderOpen, X, Zap, Sun, Moon, Monitor, Terminal, RefreshCw, Check } from 'lucide-react'
import { useConfig, useRecentWorkspaces } from '../lib/store'
import { client, AppConfig, DetectedHost } from '../lib/gstack-client'
import { toast } from '../lib/toast'

export default function Settings() {
  const { config, save } = useConfig()
  const { recents, reload: reloadRecents } = useRecentWorkspaces()
  const [form, setForm] = useState(config)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof AppConfig, string>>>({})
  const [appVersion, setAppVersion] = useState<string>('')
  const [detectedHosts, setDetectedHosts] = useState<DetectedHost[]>([])
  const [detectingHosts, setDetectingHosts] = useState(false)

  useEffect(() => {
    client.appVersion().then(setAppVersion).catch(() => {})
    detectHosts()
  }, [])

  async function detectHosts() {
    setDetectingHosts(true)
    try {
      const hosts = await client.host.detect()
      setDetectedHosts(hosts)
      // Auto-select first available host if none configured
      setForm(f => {
        if (!f.hostBin) {
          const first = hosts.find(h => h.available)
          return first ? { ...f, hostBin: first.bin } : f
        }
        return f
      })
    } catch { /* ignore */ } finally {
      setDetectingHosts(false)
    }
  }

  useEffect(() => { setForm(config) }, [config])

  function validate(): boolean {
    const e: typeof errors = {}
    if (!form.gstackPath.trim())   e.gstackPath   = 'Required — gstack Studio needs to know where gstack is installed'
    if (!form.workspacePath.trim()) e.workspacePath = 'Required — this is where your project lives and where the daemon will run'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    await save(form)
    reloadRecents()
    setSaved(true)
    toast.success('Settings saved')
    setTimeout(() => setSaved(false), 2500)
  }

  async function browseForPath(field: 'workspacePath' | 'gstackPath') {
    const path = await client.workspace.browse()
    if (path) {
      setForm(f => ({ ...f, [field]: path }))
      setErrors(v => ({ ...v, [field]: undefined }))
    }
  }

  async function switchToRecent(path: string) {
    setForm(f => ({ ...f, workspacePath: path }))
    setErrors(v => ({ ...v, workspacePath: undefined }))
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Configure how gstack Studio works on your machine</p>
      </div>

      <form onSubmit={handleSave} className="space-y-7">

        {/* Theme */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 pb-2">Appearance</h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Colour theme</label>
            <p className="text-xs text-zinc-500">Choose between dark, light, or match your system setting</p>
            <div className="flex items-center gap-1 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 w-fit">
              {([
                { value: 'dark',   label: 'Dark',   icon: <Moon size={13} /> },
                { value: 'light',  label: 'Light',  icon: <Sun size={13} /> },
                { value: 'system', label: 'System', icon: <Monitor size={13} /> },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={async () => {
                    setForm(f => ({ ...f, theme: opt.value }))
                    await client.config.set({ theme: opt.value })
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                    const isDark = opt.value === 'dark' || (opt.value === 'system' && prefersDark)
                    document.documentElement.classList.toggle('dark', isDark)
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    (form.theme ?? 'dark') === opt.value
                      ? 'bg-indigo-600 text-white'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Workspace */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 pb-2">Your project</h2>

          <Field label="Project folder" hint="The folder where your code lives. AI agents run inside this folder." error={errors.workspacePath} required>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.workspacePath}
                onChange={e => { setForm(f => ({ ...f, workspacePath: e.target.value })); setErrors(v => ({ ...v, workspacePath: undefined })) }}
                placeholder="/Users/you/my-project"
                className={inputClass(!!errors.workspacePath) + ' flex-1'}
              />
              <button
                type="button"
                onClick={() => browseForPath('workspacePath')}
                title="Browse for folder"
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0"
              >
                <FolderOpen size={15} />
              </button>
              {form.workspacePath && (
                <button
                  type="button"
                  onClick={() => client.shell.openPath(form.workspacePath)}
                  title="Open in Finder / Explorer"
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0"
                >
                  <ExternalLink size={15} />
                </button>
              )}
            </div>
          </Field>

          {/* Recent workspaces */}
          {recents.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-500 font-medium">Recent workspaces</p>
              <div className="space-y-1">
                {recents.map(p => (
                  <div key={p} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => switchToRecent(p)}
                      className={`flex-1 text-left px-3 py-1.5 rounded-lg border text-xs font-mono truncate transition-colors ${
                        p === form.workspacePath
                          ? 'border-indigo-700/60 bg-indigo-900/20 text-indigo-300'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                    >
                      {p}
                    </button>
                    {p === form.workspacePath && (
                      <span className="text-xs text-indigo-400 shrink-0">active</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Field label="gstack location" hint="Where the gstack agent library is installed on your computer. Default: ~/.claude/skills/gstack" error={errors.gstackPath} required>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.gstackPath}
                onChange={e => { setForm(f => ({ ...f, gstackPath: e.target.value })); setErrors(v => ({ ...v, gstackPath: undefined })) }}
                placeholder="/Users/you/.claude/skills/gstack"
                className={inputClass(!!errors.gstackPath) + ' flex-1'}
              />
              <button
                type="button"
                onClick={() => browseForPath('gstackPath')}
                title="Browse for folder"
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0"
              >
                <FolderOpen size={15} />
              </button>
              {form.gstackPath && (
                <button
                  type="button"
                  onClick={() => client.shell.openPath(form.gstackPath)}
                  title="Open in Finder / Explorer"
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0"
                >
                  <ExternalLink size={15} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
              <ExternalLink size={11} />
              <span>Don't have gstack yet? You can install it automatically from the <button onClick={() => {}} className="text-indigo-400 hover:underline">onboarding screen</button> or from <span className="font-mono text-zinc-400">github.com/garrytan/gstack</span></span>
            </div>
          </Field>
        </section>

        {/* Daemon */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 pb-2">AI Browser service</h2>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={form.autoStartDaemon ?? false}
                onChange={e => setForm(f => ({ ...f, autoStartDaemon: e.target.checked }))}
                className="sr-only peer"
              />
              <div className={`w-9 h-5 rounded-full border transition-colors peer-focus-visible:ring-2 ring-indigo-500/50 ${
                form.autoStartDaemon ? 'bg-indigo-600 border-indigo-500' : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'
              }`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                form.autoStartDaemon ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors flex items-center gap-1.5">
                <Zap size={13} className="text-indigo-400" />
                Start AI Browser automatically
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Start the AI browser service as soon as gstack Studio opens — no manual click needed
              </p>
            </div>
          </label>
        </section>

        {/* Agent Host */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">AI coding tool</h2>
            <button
              type="button"
              onClick={detectHosts}
              disabled={detectingHosts}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={11} className={detectingHosts ? 'animate-spin' : ''} />
              {detectingHosts ? 'Scanning…' : 'Re-scan'}
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            Choose which AI coding tool to use when you click ▶ Run on an agent. Studio will open a terminal window with the command pre-filled and ready to go.
          </p>

          {/* Detected hosts */}
          {detectedHosts.length > 0 && (
            <div className="space-y-1.5">
              {detectedHosts.map(host => (
                <label
                  key={host.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                    form.hostBin === host.bin
                      ? 'border-indigo-600/60 bg-indigo-950/20'
                      : host.available
                        ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                        : 'border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <input
                    type="radio"
                    name="hostBin"
                    value={host.bin}
                    checked={form.hostBin === host.bin}
                    onChange={() => host.available && setForm(f => ({ ...f, hostBin: host.bin }))}
                    disabled={!host.available}
                    className="sr-only"
                  />
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    form.hostBin === host.bin ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-400 dark:border-zinc-600'
                  }`}>
                    {form.hostBin === host.bin && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <Terminal size={13} className={host.available ? 'text-zinc-500' : 'text-zinc-600'} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${form.hostBin === host.bin ? 'text-indigo-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      {host.label}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono truncate">{host.bin}</p>
                  </div>
                  {host.available
                    ? <span className="text-xs text-emerald-400 flex items-center gap-1 shrink-0"><Check size={10} /> found</span>
                    : <span className="text-xs text-zinc-600 shrink-0">not found</span>
                  }
                </label>
              ))}
            </div>
          )}

          {/* Custom host path override */}
          <Field label="Custom path" hint="Paste a path here if your AI coding tool isn't listed above (e.g. /usr/local/bin/claude)">
            <div className="flex gap-2">
              <input
                type="text"
                value={form.hostBin}
                onChange={e => setForm(f => ({ ...f, hostBin: e.target.value }))}
                placeholder="/usr/local/bin/claude"
                className={inputClass(false) + ' flex-1'}
              />
              {form.hostBin && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, hostBin: '' }))}
                  title="Clear"
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 shrink-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </Field>
        </section>

        {/* API Keys */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 pb-2">API keys</h2>

          <Field label="Anthropic API key" hint="Required if you want agents to call Claude directly. Get one at console.anthropic.com.">
            <SecretInput
              value={form.anthropicApiKey}
              onChange={v => setForm(f => ({ ...f, anthropicApiKey: v }))}
              show={showAnthropicKey}
              onToggle={() => setShowAnthropicKey(s => !s)}
              placeholder="sk-ant-…"
            />
          </Field>

          <Field label="OpenAI API key" hint="Optional — used by the /codex agent for cross-model code review">
            <SecretInput
              value={form.openaiApiKey}
              onChange={v => setForm(f => ({ ...f, openaiApiKey: v }))}
              show={showOpenAIKey}
              onToggle={() => setShowOpenAIKey(s => !s)}
              placeholder="sk-…"
            />
          </Field>
        </section>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>

          {appVersion && (
            <p className="text-xs text-zinc-600 font-mono">
              gstack Studio v{appVersion}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

function inputClass(hasError: boolean) {
  return `w-full bg-zinc-50 dark:bg-zinc-900 border rounded-xl px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none transition-colors font-mono ${
    hasError ? 'border-red-700 focus:border-red-500' : 'border-zinc-200 dark:border-zinc-800 focus:border-indigo-600'
  }`
}

function Field({ label, hint, error, required, children }: {
  label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  )
}

function SecretInput({ value, onChange, show, onToggle, placeholder }: {
  value: string; onChange: (v: string) => void
  show: boolean; onToggle: () => void; placeholder: string
}) {
  return (
    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 focus-within:border-indigo-600 transition-colors">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none font-mono"
      />
      <button type="button" onClick={onToggle} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      {value && (
        <button type="button" onClick={() => onChange('')} className="text-zinc-500 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors">
          <X size={12} />
        </button>
      )}
    </div>
  )
}
