import { useEffect, useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Clock, BookOpen, Folder, Search, X, Download, ChevronDown, Sparkles } from 'lucide-react'
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

  const activeProject = projects.find(p => p.slug === activeSlug)

  return (
    <div className="flex h-full">
      {/* Project sidebar */}
      <div className="w-52 border-r border-zinc-200/60 dark:border-zinc-800/60 overflow-y-auto py-4 shrink-0 bg-zinc-50/50 dark:bg-zinc-950/30">
        <p className="px-4 text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-3">Projects</p>
        {projects.length === 0 ? (
          <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
            <Folder size={20} className="text-zinc-300 dark:text-zinc-700" />
            <p className="text-xs text-zinc-500 dark:text-zinc-600 leading-snug">No projects yet</p>
          </div>
        ) : projects.map(p => (
          <button
            key={p.slug}
            onClick={() => setActiveSlug(p.slug)}
            className={`relative w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all duration-150 ${
              activeSlug === p.slug
                ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
            }`}
          >
            {activeSlug === p.slug && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-indigo-500 dark:bg-indigo-400" />
            )}
            <Folder size={13} className="shrink-0" />
            <div className="text-left min-w-0">
              <p className="truncate font-medium text-xs">{p.slug}</p>
              {p.hasLearnings && (
                <p className="text-[10px] text-indigo-400 dark:text-indigo-500 flex items-center gap-0.5 mt-0.5">
                  <Sparkles size={9} />
                  has learnings
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Learnings panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeSlug ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-400 dark:text-zinc-600">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50 flex items-center justify-center">
              <BookOpen size={22} className="text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No project selected</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600">Pick a project on the left to view its learning history</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-3 bg-white/60 dark:bg-zinc-950/40">
              <div className="flex items-center gap-2 flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all">
                <Search size={13} className="text-zinc-400 shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search learnings…"
                  className="flex-1 bg-transparent text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>
              <span className="text-xs text-zinc-500 shrink-0 tabular-nums">
                {loadingLearnings ? 'Loading…' : `${filtered.length} / ${learnings.length}`}
              </span>
              {filtered.length > 0 && !loadingLearnings && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={exportJSON}
                    title="Export as JSON"
                    className="btn-press flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-xs"
                  >
                    <Download size={12} /> JSON
                  </button>
                  <button
                    onClick={exportMarkdown}
                    title="Export as Markdown"
                    className="btn-press flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors text-xs"
                  >
                    <Download size={12} /> MD
                  </button>
                </div>
              )}
            </div>

            {/* Entries */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingLearnings ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                        <div className="skeleton w-2 h-2 rounded-full" />
                        <div className="skeleton w-0.5 h-12 rounded-full" />
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="skeleton h-3 w-24 rounded mb-2" />
                        <div className="skeleton h-4 w-3/4 rounded mb-1.5" />
                        <div className="skeleton h-3 w-1/2 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
                  {search ? (
                    <>
                      <Search size={22} className="text-zinc-300 dark:text-zinc-700" />
                      <p className="text-sm">No results for "{search}"</p>
                      <button onClick={() => setSearch('')} className="text-xs text-indigo-400 hover:underline">Clear search</button>
                    </>
                  ) : (
                    <>
                      <BookOpen size={22} className="text-zinc-300 dark:text-zinc-700" />
                      <p className="text-sm">No learnings recorded for {activeSlug} yet</p>
                      <p className="text-xs text-zinc-500">Run AI agents in this project to capture insights</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="page-enter">
                  {/* Project header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center">
                        <BookOpen size={13} className="text-indigo-500 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{activeSlug}</h2>
                        <p className="text-xs text-zinc-500">
                          {filtered.length} learning{filtered.length !== 1 ? 's' : ''}
                          {search && <span className="text-indigo-400 ml-1">· matching "{search}"</span>}
                        </p>
                      </div>
                    </div>
                    {activeProject?.hasLearnings && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/30 border border-indigo-800/30 text-indigo-400 flex items-center gap-1">
                        <Sparkles size={9} /> Learning enabled
                      </span>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-800/80" />

                    <div className="space-y-1">
                      {filtered.map((entry, i) => (
                        <LearningRow key={i} entry={entry} highlight={search} />
                      ))}
                    </div>
                  </div>
                </div>
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
  const isMatch = highlight && String(preview).toLowerCase().includes(highlight.toLowerCase())

  return (
    <div className="flex gap-4 group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center shrink-0 pt-3.5">
        <div className={`w-[14px] h-[14px] rounded-full border-2 transition-colors duration-150 z-10 ${
          open
            ? 'border-indigo-500 bg-indigo-500/20 shadow-[0_0_6px_rgba(99,102,241,0.4)]'
            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 group-hover:border-indigo-400 dark:group-hover:border-indigo-600'
        }`} />
      </div>

      {/* Card */}
      <div className={`flex-1 mb-3 rounded-xl border transition-all duration-150 overflow-hidden ${
        open
          ? 'border-indigo-200/60 dark:border-indigo-800/40 shadow-sm'
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      } bg-white dark:bg-zinc-900`}>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
        >
          {/* Expand icon */}
          <span className="mt-0.5 text-zinc-400 shrink-0 transition-transform duration-150" style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
            <ChevronDown size={13} />
          </span>

          <div className="flex-1 min-w-0">
            {/* Timestamp */}
            {entry.timestamp && (
              <p className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-600 font-mono mb-1">
                <Clock size={10} />
                {new Date(entry.timestamp).toLocaleString()}
              </p>
            )}

            {/* Preview */}
            <p className={`text-sm leading-snug line-clamp-2 ${
              isMatch ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-700 dark:text-zinc-300'
            }`}>
              {String(preview)}
            </p>
          </div>

          {/* Skill badge */}
          {entry.skill && (
            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/30 text-indigo-400 border border-indigo-800/30 font-medium mt-0.5">
              /{entry.skill}
            </span>
          )}
        </button>

        {open && (
          <div className="border-t border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/60 dark:bg-zinc-950/40">
            <pre className="px-4 py-3.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono whitespace-pre-wrap overflow-auto max-h-64 leading-relaxed">
              {JSON.stringify(entry, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
