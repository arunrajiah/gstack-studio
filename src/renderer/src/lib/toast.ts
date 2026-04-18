/**
 * Lightweight global toast bus — no React context needed.
 * Components call `toast.success/error/info(msg)`, the ToastContainer listens.
 */

export type ToastLevel = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  level: ToastLevel
  message: string
}

type Listener = (t: Toast) => void

let seq = 0
const listeners: Set<Listener> = new Set()

function emit(level: ToastLevel, message: string): void {
  const t: Toast = { id: ++seq, level, message }
  listeners.forEach(fn => fn(t))
}

export const toast = {
  success: (msg: string) => emit('success', msg),
  error:   (msg: string) => emit('error',   msg),
  info:    (msg: string) => emit('info',    msg),

  subscribe: (fn: Listener): (() => void) => {
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  },
}
