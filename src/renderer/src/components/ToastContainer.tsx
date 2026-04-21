import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { toast, Toast } from '../lib/toast'

const DURATION = 3500   // ms before auto-dismiss
const EXIT_MS  = 250    // CSS transition duration

export default function ToastContainer() {
  const [items, setItems] = useState<Array<Toast & { leaving?: boolean }>>([])

  useEffect(() => {
    const unsub = toast.subscribe(t => {
      setItems(prev => [...prev, t])

      // Start leave animation
      setTimeout(() => {
        setItems(prev => prev.map(i => i.id === t.id ? { ...i, leaving: true } : i))
      }, DURATION)

      // Remove from DOM
      setTimeout(() => {
        setItems(prev => prev.filter(i => i.id !== t.id))
      }, DURATION + EXIT_MS)
    })
    return unsub
  }, [])

  if (items.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none"
    >
      {items.map(item => (
        <ToastItem key={item.id} item={item} onDismiss={() =>
          setItems(prev => prev.filter(i => i.id !== item.id))
        } />
      ))}
    </div>
  )
}

function ToastItem({
  item,
  onDismiss
}: {
  item: Toast & { leaving?: boolean }
  onDismiss: () => void
}) {
  const styles = {
    success: { bar: 'bg-emerald-500',  icon: <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />, ring: 'border-emerald-800/40' },
    error:   { bar: 'bg-red-500',      icon: <AlertCircle  size={14} className="text-red-400 shrink-0"     />, ring: 'border-red-800/40'     },
    info:    { bar: 'bg-indigo-500',   icon: <Info         size={14} className="text-indigo-400 shrink-0"  />, ring: 'border-indigo-800/40'  },
  }
  const s = styles[item.level]

  return (
    <div
      className={`pointer-events-auto relative flex items-start gap-2.5 min-w-[260px] max-w-sm
        bg-zinc-50 dark:bg-zinc-900 border ${s.ring} rounded-xl shadow-2xl px-3.5 py-3 text-sm
        transition-all duration-250
        ${item.leaving ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
    >
      {/* Coloured left bar */}
      <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${s.bar}`} />

      {s.icon}
      <p className="flex-1 text-zinc-800 dark:text-zinc-200 leading-snug text-xs">{item.message}</p>

      <button
        onClick={onDismiss}
        className="text-zinc-500 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors shrink-0 mt-0.5"
      >
        <X size={12} />
      </button>
    </div>
  )
}
