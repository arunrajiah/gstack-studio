import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Titlebar from './Titlebar'

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
