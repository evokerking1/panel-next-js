'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function Modal({ open, title, body, confirmLabel = 'Confirm', danger = true, onConfirm, onClose }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (typeof window === 'undefined') return null

  return createPortal(
    <div
      className={`fixed inset-0 z-[9000] flex items-center justify-center transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={panelRef}
        className={`relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/60 rounded-2xl shadow-2xl w-full max-w-sm mx-4 transform transition-transform duration-200 ${open ? 'scale-100' : 'scale-95'}`}
      >
        <div className="px-5 pt-5 pb-4">
          <p className="text-sm font-semibold text-neutral-800 dark:text-white leading-snug">{title}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">{body}</p>
        </div>
        <div className="flex gap-2 px-5 pb-5 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={`px-4 py-2 text-xs font-medium rounded-xl text-white transition ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-neutral-900 dark:bg-neutral-700 hover:bg-neutral-800 dark:hover:bg-neutral-600'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ~ https://github.com/thavanish made this shitty code
