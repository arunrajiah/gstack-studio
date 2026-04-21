import { Component, ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

interface Props  { children: ReactNode; label?: string }
interface State  { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-800/40 flex items-center justify-center">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {this.props.label ?? 'Something went wrong'}
          </p>
          <p className="text-xs text-zinc-500 max-w-sm font-mono break-all">
            {this.state.error.message}
          </p>
        </div>
        <button
          onClick={this.reset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-sm transition-colors"
        >
          <RotateCw size={13} /> Try again
        </button>
      </div>
    )
  }
}
