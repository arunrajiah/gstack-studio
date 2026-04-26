import { useEffect, useState } from 'react'
import { Download, Search, Zap } from 'lucide-react'
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
    <div className="titlebar-drag h-10 flex items-center justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/50 shrink-0 select-none">

      {/* Left: traffic-light spacer + brand */}
      <div className="titlebar-no-drag flex items-center gap-3 pl-4">
        {IS_MAC && <div className="w-16" />}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
            <Zap size={11} className="text-white" />
          </div>
          <span className="gradient-text font-bold text-sm tracking-tight">gstack</span>
          <span className="text-zinc-400 dark:text-zinc-500 text-sm font-light">Studio</span>
        </div>
        <button
          onClick={openPalette}
          title="Command palette (⌘K)"
          className="btn-press flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-xs"
        >
          <Search size={11} />
          <span className="hidden sm:inline text-zinc-500 dark:text-zinc-400">Search</span>
          <kbd className="hidden sm:inline font-mono text-[10px] text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>

      {/* Centre: update banner */}
      {(update || updateReady) && (
        <div className="titlebar-no-drag flex items-center gap-2 text-xs">
          {updateReady ? (
            <button
              onClick={() => client.updater.install()}
              className="btn-press flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm"
            >
              <Download size={11} /> Restart to update
            </button>
          ) : (
            <button
              onClick={() => client.updater.download()}
              className="btn-press flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600/15 text-indigo-400 border border-indigo-600/30 hover:bg-indigo-600/25 transition-colors"
            >
              <Download size={11} /> v{update?.version} available
            </button>
          )}
        </div>
      )}

      {/* Right: status pill + window controls */}
      <div className="flex items-center gap-2 pr-2">
        <div className={`titlebar-no-drag flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
          state.running
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 border border-zinc-200 dark:border-zinc-700/60'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
            state.running
              ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
              : 'bg-zinc-400 dark:bg-zinc-600'
          }`} />
          {state.running ? `AI Browser :${state.port}` : 'AI Browser offline'}
        </div>

        {!IS_MAC && <WindowControls />}
      </div>
    </div>
  )
}
