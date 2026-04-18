import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle2, FolderOpen, X, Zap } from 'lucide-react'
import { useConfig, useRecentWorkspaces } from '../lib/store'
import { client, AppConfig } from '../lib/gstack-client'
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

  useEffect(() => {
    client.appVersion().then(setAppVersion).catch(() => {})
  }, [])

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
        <h1 className="text-xl font-semibold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Stored at <code className="font-mono text-zinc-400">~/.gstack/studio-config.json</code>
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-7">

        {/* Workspace */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">Workspace</h2>

          <Field label="Workspace Directory" hint="The project folder you work in — gstack writes .gstack/browse.json here when the daemon starts" error={errors.workspacePath} required>
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
                className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200 shrink-0"
              >
                <FolderOpen size={15} />
              </button>
              {form.workspacePath && (
                <button
                  type="button"
                  onClick={() => client.shell.openPath(form.workspacePath)}
                  title="Open in Finder / Explorer"
                  className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200 shrink-0"
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
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
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

          <Field label="gstack Install Path" hint="Where gstack is installed. Default: ~/.claude/skills/gstack" error={errors.gstackPath} required>
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
                className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200 shrink-0"
              >
                <FolderOpen size={15} />
              </button>
              {form.gstackPath && (
                <button
                  type="button"
                  onClick={() => client.shell.openPath(form.gstackPath)}
                  title="Open in Finder / Explorer"
                  className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200 shrink-0"
                >
                  <ExternalLink size={15} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
              <ExternalLink size={11} />
              <span>Don't have gstack? Install from <span className="font-mono text-zinc-400">github.com/garrytan/gstack</span></span>
            </div>
          </Field>
        </section>

        {/* Daemon */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">Daemon</h2>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={form.autoStartDaemon ?? false}
                onChange={e => setForm(f => ({ ...f, autoStartDaemon: e.target.checked }))}
                className="sr-only peer"
              />
              <div className={`w-9 h-5 rounded-full border transition-colors peer-focus-visible:ring-2 ring-indigo-500/50 ${
                form.autoStartDaemon ? 'bg-indigo-600 border-indigo-500' : 'bg-zinc-800 border-zinc-700'
              }`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                form.autoStartDaemon ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors flex items-center gap-1.5">
                <Zap size={13} className="text-indigo-400" />
                Auto-start daemon on launch
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Start the browse server automatically when gstack Studio opens
              </p>
            </div>
          </label>
        </section>

        {/* API Keys */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">API Keys</h2>

          <Field label="Anthropic API Key" hint="Required for running skills via the Claude API">
            <SecretInput
              value={form.anthropicApiKey}
              onChange={v => setForm(f => ({ ...f, anthropicApiKey: v }))}
              show={showAnthropicKey}
              onToggle={() => setShowAnthropicKey(s => !s)}
              placeholder="sk-ant-…"
            />
          </Field>

          <Field label="OpenAI API Key" hint="Optional — used by /codex for cross-model review">
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
  return `w-full bg-zinc-900 border rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-colors font-mono ${
    hasError ? 'border-red-700 focus:border-red-500' : 'border-zinc-800 focus:border-indigo-600'
  }`
}

function Field({ label, hint, error, required, children }: {
  label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-300">
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
    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 focus-within:border-indigo-600 transition-colors">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none font-mono"
      />
      <button type="button" onClick={onToggle} className="text-zinc-500 hover:text-zinc-300 transition-colors">
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      {value && (
        <button type="button" onClick={() => onChange('')} className="text-zinc-600 hover:text-zinc-400 transition-colors">
          <X size={12} />
        </button>
      )}
    </div>
  )
}
