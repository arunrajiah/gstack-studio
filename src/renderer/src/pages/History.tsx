import { useEffect, useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Clock, BookOpen, ChevronDown, ChevronRight, Folder, Search, X, Download } from 'lucide-react'
import { client, GStackProject, Learning } from '../lib/gstack-client'
import { toast } from '../lib/toast'

export default function History() {
  const location = useLocation()
  const initialSlug = (location.state as { slug?: string } | null)?.slug ?? null

  const [projects, setProjects] = useState<GStackProject[]>([])
  const [activeSlug, setActiveSlug] = useState<string | null>(initialSlug)
  const [learnings, setLearnings] = useState<Learning[]>([])
  const [loadingLearnings, setLoadingLearnings] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    client.projects().then(setProjects).catch(console.error)
  }, [])

  useEffect(() => {
    if (!activeSlug) return
    setLoadingLearnings(true)
    setSearch('')
    client.learnings(activeSlug)
      .then(setLearnings)
      .catch(console.error)
      .finally(() => setLoadingLearnings(false))
  }, [activeSlug])

  const filtered = useMemo(() => {
    if (!search.trim()) return learnings
    const q = search.toLowerCase()
    return learnings.filter(e => JSON.stringify(e).toLowerCase().includes(q))
  }, [learnings, search])

  function exportJSON() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeSlug}-learnings.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} entries as JSON`)
  }

  function exportMarkdown() {
    const lines: string[] = [
      `# ${activeSlug} — Learning History`,
      ``,
      `Exported ${new Date().toLocaleString()} · ${filtered.length} entries`,
      ``,
    ]
    for (const entry of filtered) {
      lines.push(`---`)
      if (entry.timestamp) lines.push(`**${new Date(entry.timestamp).toLocaleString()}**`)
      if (entry.skill)     lines.push(`*Skill: ${entry.skill}*`)
      if (entry.message)   lines.push(``, entry.message)
      const extra = Object.entries(entry).filter(([k]) => !['timestamp','skill','message'].includes(k))
      if (extra.length)    lines.push(``, '```json', JSON.stringify(Object.fromEntries(extra), null, 2), '```')
      lines.push(``)
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeSlug}-learnings.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} entries as Markdown`)
  }

  return (
    <div className="flex h-full">
      {/* Project sidebar */}
      <div className="w-52 border-r border-zinc-200/60 dark:border-zinc-800/60 overflow-y-auto py-4 shrink-0">
        <p className="px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Projects</p>
        {projects.length === 0 ? (
          <p className="px-4 text-xs text-zinc-500 dark:text-zinc-600">No projects yet</p>
        ) : projects.map(p => (
          <button
            key={p.slug}
            onClick={() => setActiveSlug(p.slug)}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
              activeSlug === p.slug
                ? 'bg-indigo-600/10 text-indigo-400 border-r-2 border-indigo-500'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <Folder size={13} className="shrink-0" />
            <div className="text-left min-w-0">
              <p className="truncate">{p.slug}</p>
              {p.hasLearnings && <p className="text-xs text-zinc-600 truncate">has learnings</p>}
            </div>
          </button>
        ))}
      </div>

      {/* Learnings panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeSlug ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
            <BookOpen size={28} />
            <p className="text-sm">Select a project to view its learning history</p>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="px-6 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 focus-within:border-indigo-600 transition-colors">
                <Search size={13} className="text-zinc-500 dark:text-zinc-600 shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search learnings…"
                  className="flex-1 bg-transparent text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-zinc-400">
                    <X size={12} />
                  </button>
                )}
              </div>
              <span className="text-xs text-zinc-600 shrink-0">
                {loadingLearnings ? 'Loading…' : `${filtered.length} / ${learnings.length}`}
              </span>
              {filtered.length > 0 && !loadingLearnings && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={exportJSON}
                    title="Export as JSON"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-xs"
                  >
                    <Download size={12} /> JSON
                  </button>
                  <button
                    onClick={exportMarkdown}
                    title="Export as Markdown"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-xs"
                  >
                    <Download size={12} /> MD
                  </button>
                </div>
              )}
            </div>

            {/* Entries */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {loadingLearnings ? (
                <div className="text-sm text-zinc-500 animate-pulse">Loading learnings…</div>
              ) : filtered.length === 0 ? (
                <div className="text-sm text-zinc-500">
                  {search ? `No results for "${search}"` : `No learnings recorded for ${activeSlug} yet.`}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen size={14} className="text-zinc-400" />
                    <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{activeSlug}</h2>
                    {search && <span className="text-xs text-indigo-400">{filtered.length} match{filtered.length !== 1 ? 'es' : ''}</span>}
                  </div>
                  {filtered.map((entry, i) => <LearningRow key={i} entry={entry} highlight={search} />)}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function LearningRow({ entry, highlight }: { entry: Learning; highlight: string }) {
  const [open, setOpen] = useState(false)
  const keys = Object.keys(entry).filter(k => k !== 'timestamp')
  const preview = entry.message ?? entry.skill ?? (keys[0] ? String(entry[keys[0]]) : 'entry')

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40 transition-colors text-left"
      >
        {open
          ? <ChevronDown size={13} className="text-zinc-500 shrink-0" />
          : <ChevronRight size={13} className="text-zinc-500 shrink-0" />
        }
        {entry.timestamp && (
          <span className="flex items-center gap-1 text-xs text-zinc-600 font-mono shrink-0">
            <Clock size={11} />
            {new Date(entry.timestamp).toLocaleString()}
          </span>
        )}
        <span className={`text-sm truncate ${highlight && String(preview).toLowerCase().includes(highlight.toLowerCase()) ? 'text-amber-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
          {String(preview)}
        </span>
        {entry.skill && (
          <span className="ml-auto shrink-0 text-xs px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-400 border border-indigo-800/40">
            {entry.skill}
          </span>
        )}
      </button>
      {open && (
        <pre className="px-4 pb-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono whitespace-pre-wrap overflow-auto border-t border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-100/40 dark:bg-zinc-950/40 max-h-64">
          {JSON.stringify(entry, null, 2)}
        </pre>
      )}
    </div>
  )
}
