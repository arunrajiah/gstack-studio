import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Workflow, Globe, History, Bot, Settings } from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sprint',    icon: Workflow,         label: 'Sprint Board' },
  { to: '/agents',    icon: Bot,              label: 'Agents' },
  { to: '/browse',    icon: Globe,            label: 'Browse Console' },
  { to: '/history',   icon: History,          label: 'History' },
]

export default function Sidebar() {
  return (
    <aside className="w-14 flex flex-col items-center py-3 gap-1 bg-zinc-950 border-r border-zinc-800/60 shrink-0 select-none">
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          title={label}
          className={({ isActive }) =>
            `w-9 h-9 flex items-center justify-center rounded-lg transition-colors titlebar-no-drag ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
            }`
          }
        >
          <Icon size={18} />
        </NavLink>
      ))}

      <div className="flex-1" />

      <NavLink
        to="/settings"
        title="Settings"
        className={({ isActive }) =>
          `w-9 h-9 flex items-center justify-center rounded-lg transition-colors titlebar-no-drag ${
            isActive
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
          }`
        }
      >
        <Settings size={18} />
      </NavLink>
    </aside>
  )
}
