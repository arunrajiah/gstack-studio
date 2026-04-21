import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Sprint from './pages/Sprint'
import Browse from './pages/Browse'
import History from './pages/History'
import Agents from './pages/Agents'
import Settings from './pages/Settings'
import { client } from './lib/gstack-client'

function applyTheme(theme: string) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
}

export default function App() {
  useEffect(() => {
    client.config.get().then(cfg => applyTheme(cfg.theme ?? 'dark')).catch(() => applyTheme('dark'))

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      client.config.get().then(cfg => { if ((cfg.theme ?? 'dark') === 'system') applyTheme('system') })
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sprint"    element={<Sprint />} />
          <Route path="browse"    element={<Browse />} />
          <Route path="history"   element={<History />} />
          <Route path="agents"    element={<Agents />} />
          <Route path="settings"  element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
