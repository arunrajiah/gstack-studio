import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Clock, BookOpen, ChevronDown, ChevronRight, Folder } from 'lucide-react'
import { client, GStackProject, Learning } from '../lib/gstack-client'

export default function History() {
  const location = useLocation()
  const initialSlug = (location.state as { slug?: string } | null)?.slug ?? null

  const [projects, setProjects] = useState<GStackProject[]>([])
  const [activeSlug, setActiveSlug] = useState<string | null>(initialSlug)
  const [learnings, setLearnings] = useState<Learning[]>([])
  const [loadingLearnings, setLoadingLearnings] = useState(false)

  useEffect(() => {
    client.projects().then(setProjects).catch(console.error)
  }, [])

  useEffect(() => {
    if (!activeSlug) return
    setLoadingLearnings(true)
    client.learnings(activeSlug)
      .then(setLearnings)
      .catch(console.error)
      .finally(() => setLoadingLearnings(false))
  }, [activeSlug])

  return (
    <div className="flex h-full">
      {/* Project list */}
      <div className="w-52 border-r border-zinc-800/60 overflow-y-auto py-4 shrink-0">
        <p className="px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Projects</p>
        {projects.length === 0 ? (
          <p className="px-4 text-xs text-zinc-600">No projects yet</p>
        ) : (
          projects.map(p => (
            <button
              key={p.slug}
              onClick={() => setActiveSlug(p.slug)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                activeSlug === p.slug
                  ? 'bg-indigo-600/10 text-indigo-400 border-r-2 border-indigo-500'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Folder size={13} className="shrink-0" />
              <span className="truncate">{p.slug}</span>
            </button>
          ))
        )}
      </div>

      {/* Learnings panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {!activeSlug ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-600 gap-3">
            <BookOpen size={28} />
            <p className="text-sm">Select a project to view its learning history</p>
          </div>
        ) : loadingLearnings ? (
          <div className="text-sm text-zinc-500 animate-pulse">Loading learnings…</div>
        ) : learnings.length === 0 ? (
          <div className="text-sm text-zinc-500">No learnings recorded for <code className="font-mono text-zinc-400">{activeSlug}</code> yet.</div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={14} className="text-zinc-400" />
              <h2 className="text-sm font-medium text-zinc-300">{activeSlug}</h2>
              <span className="text-xs text-zinc-600">· {learnings.length} entries</span>
            </div>
            {learnings.map((entry, i) => (
              <LearningRow key={i} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LearningRow({ entry }: { entry: Learning }) {
  const [open, setOpen] = useState(false)
  const keys = Object.keys(entry).filter(k => k !== 'timestamp')
  const preview = entry.message ?? entry.skill ?? keys[0] ?? 'entry'

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors"
      >
        {open ? <ChevronDown size={13} className="text-zinc-500 shrink-0" /> : <ChevronRight size={13} className="text-zinc-500 shrink-0" />}
        {entry.timestamp && (
          <span className="flex items-center gap-1 text-xs text-zinc-600 font-mono shrink-0">
            <Clock size={11} />
            {new Date(entry.timestamp).toLocaleString()}
          </span>
        )}
        <span className="text-sm text-zinc-300 truncate text-left">{String(preview)}</span>
        {entry.skill && (
          <span className="ml-auto shrink-0 text-xs px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-400 border border-indigo-800/40">
            {entry.skill}
          </span>
        )}
      </button>
      {open && (
        <pre className="px-4 pb-4 text-xs text-zinc-400 font-mono whitespace-pre-wrap overflow-auto border-t border-zinc-800/60 bg-zinc-950/40 max-h-64">
          {JSON.stringify(entry, null, 2)}
        </pre>
      )}
    </div>
  )
}
