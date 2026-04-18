import { useEffect, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { useDaemon } from '../lib/store'
import { client } from '../lib/gstack-client'
import WindowControls from './WindowControls'

const IS_MAC = navigator.userAgent.includes('Mac')

export default function Titlebar() {
  const { state } = useDaemon()
  const [update, setUpdate] = useState<{ version: string } | null>(null)
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    client.updater.onAvailable(info => setUpdate(info))
    client.updater.onReady(() => setUpdateReady(true))
  }, [])

  function openPalette() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  }

  return (
    <div className="titlebar-drag h-10 flex items-center justify-between bg-zinc-950 border-b border-zinc-800/60 shrink-0 select-none">
      {/* Left: traffic-light spacer on macOS, logo + search trigger */}
      <div className="titlebar-no-drag flex items-center gap-2 pl-4">
        {IS_MAC && <div className="w-16" />}
        <span className="text-indigo-400 font-semibold text-sm tracking-tight">gstack</span>
        <span className="text-zinc-500 text-sm">Studio</span>
        <button
          onClick={openPalette}
          title="Command palette (⌘K)"
          className="ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-zinc-800 bg-zinc-900 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
        >
          <Search size={11} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline font-mono text-zinc-600">⌘K</kbd>
        </button>
      </div>

      {/* Centre: update banner */}
      {(update || updateReady) && (
        <div className="titlebar-no-drag flex items-center gap-2 text-xs">
          {updateReady ? (
            <button
              onClick={() => client.updater.install()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              <Download size={11} /> Restart to update
            </button>
          ) : (
            <button
              onClick={() => client.updater.download()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-700/50 hover:bg-indigo-600/30 transition-colors"
            >
              <Download size={11} /> v{update?.version} available
            </button>
          )}
        </div>
      )}

      {/* Right: daemon pill + window controls */}
      <div className="flex items-center gap-2 pr-2">
        <div className={`titlebar-no-drag flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${
          state.running ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${state.running ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
          {state.running ? `Daemon :${state.port}` : 'Daemon offline'}
        </div>

        {/* Only shown on Windows / Linux — macOS uses native traffic lights */}
        {!IS_MAC && <WindowControls />}
      </div>
    </div>
  )
}
