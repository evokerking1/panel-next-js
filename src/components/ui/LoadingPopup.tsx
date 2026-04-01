'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Step {
  text: string
  type: 'pending' | 'done' | 'error'
}

interface LoadingPopupProps {
  open: boolean
  title: string
  message?: string
  steps?: Step[]
  state?: 'loading' | 'done' | 'error'
  onHide: () => void
}

export default function LoadingPopup({ open, title, message, steps = [], state = 'loading', onHide }: LoadingPopupProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/60 rounded-2xl p-5 w-full max-w-sm mx-4 mb-4 sm:mb-0 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="mt-0.5 shrink-0 text-neutral-400">
                {state === 'loading' && (
                  <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
                )}
                {state === 'done' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {state === 'error' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-white leading-tight">{title}</p>
                  <div className={`w-[7px] h-[7px] rounded-full shrink-0 ${
                    state === 'done' ? 'bg-emerald-400' :
                    state === 'error' ? 'bg-red-400' :
                    'bg-neutral-300 dark:bg-neutral-600 animate-pulse'
                  }`} />
                </div>
                {message && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-tight">{message}</p>
                )}
              </div>
            </div>

            {steps.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {step.type === 'done' && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                    {step.type === 'error' && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-400 shrink-0"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    )}
                    {step.type === 'pending' && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-300 dark:text-neutral-600 shrink-0"><circle cx="12" cy="12" r="1" /></svg>
                    )}
                    <span className={`text-xs leading-tight ${
                      step.type === 'done' ? 'text-neutral-600 dark:text-neutral-300' :
                      step.type === 'error' ? 'text-red-400' :
                      'text-neutral-500 dark:text-neutral-400'
                    }`}>{step.text}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={onHide}
              className="w-full rounded-xl bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 text-white dark:text-neutral-900 px-3 py-2 text-xs font-medium transition">
              Hide
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
