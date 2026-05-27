'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'
interface Toast { id: string; type: ToastType; title: string; message?: string }
interface ToastCtx { toast: (type: ToastType, title: string, message?: string) => void }

const ToastContext = createContext<ToastCtx | null>(null)

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}
const colors = {
  success: 'var(--status-paid)',
  error: 'var(--status-late)',
  info: 'var(--primary)',
  warning: 'var(--risk-medium)',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => {
          const Icon = icons[t.type]
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <Icon size={18} style={{ color: colors[t.type], flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: 'var(--foreground)' }}>{t.title}</div>
                {t.message && <div style={{ color: 'var(--foreground-muted)', marginTop: 2, fontSize: '0.8125rem' }}>{t.message}</div>}
              </div>
              <button onClick={() => remove(t.id)} style={{ color: 'var(--foreground-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx.toast
}
