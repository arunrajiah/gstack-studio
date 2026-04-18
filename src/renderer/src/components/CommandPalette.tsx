import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Workflow, Bot, Globe, History, Settings,
  Copy, Check, ChevronRight, Search
} from 'lucide-react'
import { useSkills } from '../lib/store'
import { client, Skill } from '../lib/gstack-client'
import { toast } from '../lib/toast'

interface NavItem {
  type: 'nav'
  label: string
  description: string
  to: string
  icon: React.ReactNode
  shortcut: string
}

interface SkillItem {
  type: 'skill'
  skill: Skill
}

type Item = NavItem | SkillItem

const NAV_ITEMS: NavItem[] = [
  { type: 'nav', label: 'Dashboard',      description: 'Daemon status & quick actions',   to: '/dashboard', icon: <LayoutDashboard size={14} />, shortcut: '⌘1' },
  { type: 'nav', label: 'Sprint Board',   description: 'All 23 agents by phase',           to: '/sprint',    icon: <Workflow size={14} />,        shortcut: '⌘2' },
  { type: 'nav', label: 'Agents',         description: 'Skill browser + live daemon logs', to: '/agents',    icon: <Bot size={14} />,             shortcut: '⌘3' },
  { type: 'nav', label: 'Browse Console', description: 'Send browser automation commands', to: '/browse',    icon: <Globe size={14} />,           shortcut: '⌘4' },
  { type: 'nav', label: 'History',        description: 'Per-project learnings viewer',     to: '/history',   icon: <History size={14} />,         shortcut: '⌘5' },
  { type: 'nav', label: 'Settings',       description: 'Workspace, API keys, preferences', to: '/settings',  icon: <Settings size={14} />,        shortcut: '⌘6' },
]

interface Props {
  onClose: () => void
}

export default function CommandPalette({ onClose }: Props) {
  const navigate = useNavigate()
  const { skills } = useSkills()

  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Build filtered items
  const items = useCallback((): Item[] => {
    const q = query.toLowerCase().trim()

    const navItems: NavItem[] = q
      ? NAV_ITEMS.filter(n =>
          n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)
        )
      : NAV_ITEMS

    const skillItems: SkillItem[] = skills
      .filter(s => !q || (
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.phase.toLowerCase().includes(q)
      ))
      .map(s => ({ type: 'skill' as const, skill: s }))

    return [...navItems, ...skillItems]
  }, [query, skills])

  const allItems = items()

  // Reset cursor when results change
  useEffect(() => { setCursor(0) }, [query])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  async function selectItem(item: Item) {
    if (item.type === 'nav') {
      navigate(item.to)
      onClose()
    } else {
      await client.copyCommand(item.skill.id)
      setCopiedId(item.skill.id)
      toast.success(`/${item.skill.id} copied to clipboard`)
      setTimeout(() => {
        setCopiedId(null)
        onClose()
      }, 800)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allItems[cursor]) selectItem(allItems[cursor])
    }
  }

  // Group items for display
  const navGroup  = allItems.filter(i => i.type === 'nav') as NavItem[]
  const skillGroup = allItems.filter(i => i.type === 'skill') as SkillItem[]
  let globalIdx = 0

  return (
    <div
      className="fixed inset-0 z-[200] bg-zinc-950/80 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]">

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search size={16} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages and skills…"
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 outline-none"
          />
          <kbd className="hidden sm:block text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {allItems.length === 0 && (
            <p className="px-4 py-8 text-sm text-zinc-600 text-center">No results for "{query}"</p>
          )}

          {/* Pages group */}
          {navGroup.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-medium text-zinc-600 uppercase tracking-wider">Pages</p>
              {navGroup.map(item => {
                const idx = globalIdx++
                const active = idx === cursor
                return (
                  <button
                    key={item.to}
                    data-active={active}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setCursor(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                      active ? 'bg-indigo-600/15' : 'hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className={`shrink-0 ${active ? 'text-indigo-400' : 'text-zinc-500'}`}>
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${active ? 'text-indigo-300' : 'text-zinc-200'}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <kbd className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">{item.shortcut}</kbd>
                      <ChevronRight size={12} className={active ? 'text-indigo-400' : 'text-zinc-600'} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Skills group */}
          {skillGroup.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-medium text-zinc-600 uppercase tracking-wider">
                Skills — click to copy command
              </p>
              {skillGroup.map(item => {
                const idx = globalIdx++
                const active = idx === cursor
                const copied = copiedId === item.skill.id
                return (
                  <button
                    key={item.skill.id}
                    data-active={active}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setCursor(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                      active ? 'bg-indigo-600/15' : 'hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className="text-base shrink-0">{item.skill.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${active ? 'text-indigo-300' : 'text-zinc-200'}`}>
                        {item.skill.name}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">{item.skill.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <code className="text-xs font-mono text-zinc-600">/{item.skill.id}</code>
                      {copied
                        ? <Check size={13} className="text-emerald-400" />
                        : <Copy size={13} className={active ? 'text-zinc-400' : 'text-zinc-600'} />
                      }
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <div className="h-2" />
        </div>

        {/* Footer hint */}
        <div className="border-t border-zinc-800 px-4 py-2 flex items-center gap-4 text-xs text-zinc-600">
          <span><kbd className="bg-zinc-800 px-1 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="bg-zinc-800 px-1 rounded">↵</kbd> select</span>
          <span><kbd className="bg-zinc-800 px-1 rounded">esc</kbd> close</span>
          <span className="ml-auto">{allItems.length} result{allItems.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}
