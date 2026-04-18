import { Minus, Square, X, Maximize2 } from 'lucide-react'
import { client } from '../lib/gstack-client'

/**
 * Custom min / max / close buttons for Windows and Linux.
 * Shown only when `process.platform !== 'darwin'` (darwin uses native traffic lights).
 */
export default function WindowControls() {
  return (
    <div className="flex items-center titlebar-no-drag select-none">
      <button
        onClick={() => client.window.minimize()}
        className="h-10 w-12 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        title="Minimize"
      >
        <Minus size={14} />
      </button>
      <button
        onClick={() => client.window.maximize()}
        className="h-10 w-12 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        title="Maximize / Restore"
      >
        <Square size={11} />
        <Maximize2 size={11} className="-ml-2 opacity-0 group-hover:opacity-100" />
      </button>
      <button
        onClick={() => client.window.close()}
        className="h-10 w-12 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-red-600 transition-colors"
        title="Close"
      >
        <X size={14} />
      </button>
    </div>
  )
}
