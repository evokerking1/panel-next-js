'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  if (type === 'success')
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-emerald-500 shrink-0">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
      </svg>
    )
  if (type === 'error')
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-red-500 shrink-0">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
      </svg>
    )
  if (type === 'warning')
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-amber-500 shrink-0">
        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
      </svg>
    )
  if (type === 'loading')
    return (
      <svg className="animate-spin w-5 h-5 text-blue-500 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-blue-500 shrink-0">
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
    </svg>
  )
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

// ~ https://github.com/thavanish made this shitty code
