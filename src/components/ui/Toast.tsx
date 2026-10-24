import { CircleAlert, CircleCheck } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
}

const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const show = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = ++counter.current
    setToasts((ts) => [...ts, { id, message, tone }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'animate-fade-up flex max-w-sm items-center gap-2.5 rounded-control px-4 py-3 text-sm font-semibold shadow-raised',
              t.tone === 'success' ? 'bg-ink text-white' : 'bg-danger-ink text-white',
            )}
          >
            {t.tone === 'success' ? <CircleCheck className="size-4.5 shrink-0" aria-hidden /> : <CircleAlert className="size-4.5 shrink-0" aria-hidden />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
