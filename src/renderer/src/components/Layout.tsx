import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Titlebar from './Titlebar'
import ErrorBoundary from './ErrorBoundary'
import Onboarding from '../pages/Onboarding'
import { client, AppConfig } from '../lib/gstack-client'

export default function Layout() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

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
    </div>
  )
}
