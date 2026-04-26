import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Workflow, Globe, History, Bot, Settings, Heart } from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', shortcut: '⌘1' },
  { to: '/sprint',    icon: Workflow,         label: 'Board',     shortcut: '⌘2' },
  { to: '/agents',    icon: Bot,              label: 'Activity',  shortcut: '⌘3' },
  { to: '/browse',    icon: Globe,            label: 'Browser',   shortcut: '⌘4' },
  { to: '/history',   icon: History,          label: 'History',   shortcut: '⌘5' },
]

export default function Sidebar() {
  return (
    <aside className="w-[68px] flex flex-col items-center py-2 gap-0.5 bg-zinc-50/80 dark:bg-zinc-950/80 border-r border-zinc-200/60 dark:border-zinc-800/50 shrink-0 select-none">
      {NAV.map(({ to, icon: Icon, label, shortcut }) => (
        <NavLink
          key={to}
          to={to}
          title={`${label}  ${shortcut}`}
          className={({ isActive }) =>
            `relative w-full flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all duration-150 titlebar-no-drag ${
              isActive
                ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {/* Linear-style left indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-indigo-500 dark:bg-indigo-400" />
              )}
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className={`text-[10px] font-medium leading-none transition-colors ${
                isActive ? 'text-indigo-500 dark:text-indigo-400' : ''
              }`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}

      <div className="flex-1" />

      <a
        href="https://github.com/sponsors/arunrajiah"
        target="_blank"
        rel="noreferrer"
        title="Sponsor this project"
        className="w-full flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-colors titlebar-no-drag text-zinc-400 hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/20"
      >
        <Heart size={17} strokeWidth={1.8} />
        <span className="text-[10px] font-medium leading-none">Sponsor</span>
      </a>

      <NavLink
        to="/settings"
        title="Settings  ⌘6"
        className={({ isActive }) =>
          `relative w-full flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all duration-150 titlebar-no-drag ${
            isActive
              ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
              : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-indigo-500 dark:bg-indigo-400" />
            )}
            <Settings size={17} strokeWidth={isActive ? 2.2 : 1.8} />
            <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-indigo-500 dark:text-indigo-400' : ''}`}>
              Settings
            </span>
          </>
        )}
      </NavLink>
    </aside>
  )
}
