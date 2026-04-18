import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Titlebar from './Titlebar'
import ErrorBoundary from './ErrorBoundary'
import ToastContainer from './ToastContainer'
import Onboarding from '../pages/Onboarding'
import { client, AppConfig } from '../lib/gstack-client'

export default function Layout() {
  const navigate = useNavigate()
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Global keyboard shortcuts: Cmd/Ctrl + 1-6
  useEffect(() => {
    const ROUTES = ['/dashboard', '/sprint', '/agents', '/browse', '/history', '/settings']
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return
      const n = parseInt(e.key)
      if (n >= 1 && n <= ROUTES.length) {
        e.preventDefault()
        navigate(ROUTES[n - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  useEffect(() => {
    client.config.get().then(cfg => {
      setConfig(cfg)
      // Show onboarding when either required path is missing
      if (!cfg.gstackPath || !cfg.workspacePath) {
        setShowOnboarding(true)
      }
    }).catch(() => {
      setShowOnboarding(true)
    })
  }, [])

  function handleOnboardingComplete(updates: Partial<AppConfig>) {
    setConfig(c => c ? { ...c, ...updates } : (updates as AppConfig))
    setShowOnboarding(false)
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* First-launch onboarding overlay */}
      {showOnboarding && config !== null && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      {/* Global toast notifications */}
      <ToastContainer />
    </div>
  )
}
