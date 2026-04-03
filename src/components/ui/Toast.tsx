'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'loading' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastProps {
  toasts: ToastItem[]
  onRemove: (id: string) => void
}

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
  if (type === 'error')   return <XCircle className="w-5 h-5 text-red-500 shrink-0" />
  if (type === 'warning') return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
  if (type === 'loading') return <Loader2 className="animate-spin w-5 h-5 text-blue-500 shrink-0" />
  return <Info className="w-5 h-5 text-blue-500 shrink-0" />
}

const colorMap: Record<ToastType, string> = {
  success: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  error:   'text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
  warning: 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  loading: 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  info:    'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
}

function SingleToast({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    requestAnimationFrame(() => {
      el.classList.remove('opacity-0', 'translate-x-full')
      el.classList.add('opacity-100', 'translate-x-0')
    })
    if (toast.type === 'loading') return
    const t = setTimeout(() => onRemove(toast.id), 5000)
    return () => clearTimeout(t)
  }, [toast.id, toast.type, onRemove])

  return (
    <div
      ref={ref}
      className={`px-4 py-3 rounded-xl shadow-lg transform transition-all duration-300 ease-in-out opacity-0 translate-x-full flex items-center gap-3 border bg-white dark:bg-neutral-800 ${colorMap[toast.type]}`}
    >
      <ToastIcon type={toast.type} />
      <span className="font-medium text-sm">{toast.message}</span>
    </div>
  )
}

export default function ToastContainer({ toasts, onRemove }: ToastProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <SingleToast toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>,
    document.body,
  )
}
