'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const ICONS: Record<ToastType, React.FC<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200 ring-1 ring-emerald-600/10',
  error:   'bg-red-50 text-red-800 border-red-200 ring-1 ring-red-600/10',
  info:    'bg-[#eeeeff] text-[#040B4D] border-[#b0adff] ring-1 ring-[#2605EF]/10',
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = ICONS[toast.type]

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-card animate-in',
        STYLES[toast.type],
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 rounded hover:bg-black/5 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
