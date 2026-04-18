import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useConfig } from '../lib/store'
import { AppConfig } from '../lib/gstack-client'

export default function Settings() {
  const { config, save } = useConfig()
  const [form, setForm] = useState(config)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof AppConfig, string>>>({})

  useEffect(() => { setForm(config) }, [config])

  function validate(): boolean {
    const e: typeof errors = {}
    if (!form.gstackPath.trim()) {
      e.gstackPath = 'Required — gstack Studio needs to know where gstack is installed'
    }
    if (!form.workspacePath.trim()) {
      e.workspacePath = 'Required — this is where your project lives and where the daemon will run'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    await save(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
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
          <h2 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">
            Workspace
          </h2>

          <Field
            label="Workspace Directory"
            hint="The project folder you work in — gstack writes .gstack/browse.json here when the daemon starts"
            error={errors.workspacePath}
            required
          >
            <input
              type="text"
              value={form.workspacePath}
              onChange={e => { setForm(f => ({ ...f, workspacePath: e.target.value })); setErrors(v => ({ ...v, workspacePath: undefined })) }}
              placeholder="/Users/you/my-project"
              className={inputClass(!!errors.workspacePath)}
            />
          </Field>

          <Field
            label="gstack Install Path"
            hint="Where gstack is installed. Default: ~/.claude/skills/gstack"
            error={errors.gstackPath}
            required
          >
            <input
              type="text"
              value={form.gstackPath}
              onChange={e => { setForm(f => ({ ...f, gstackPath: e.target.value })); setErrors(v => ({ ...v, gstackPath: undefined })) }}
              placeholder={`/Users/you/.claude/skills/gstack`}
              className={inputClass(!!errors.gstackPath)}
            />
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
              <ExternalLink size={11} />
              <span>Don't have gstack? Install from <span className="font-mono text-zinc-400">github.com/garrytan/gstack</span></span>
            </div>
          </Field>
        </section>

        {/* API Keys */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">
            API Keys
          </h2>

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

        <button
          type="submit"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
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
    </div>
  )
}
