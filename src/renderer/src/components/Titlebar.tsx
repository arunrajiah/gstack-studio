import { useDaemon } from '../lib/store'

export default function Titlebar() {
  const { state } = useDaemon()

  return (
    <div className="titlebar-drag h-10 flex items-center justify-between px-4 bg-zinc-950 border-b border-zinc-800/60 shrink-0">
      <div className="titlebar-no-drag flex items-center gap-2">
        {/* macOS traffic lights sit here in hiddenInset mode */}
        <div className="ml-16 flex items-center gap-1.5">
          <span className="text-indigo-400 font-semibold text-sm tracking-tight">gstack</span>
          <span className="text-zinc-500 text-sm">Studio</span>
        </div>
      </div>

      <div className="titlebar-no-drag flex items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${
          state.running
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-zinc-800 text-zinc-500'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${state.running ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
          {state.running ? `Daemon :${state.port}` : 'Daemon offline'}
        </span>
      </div>
    </div>
  )
}
