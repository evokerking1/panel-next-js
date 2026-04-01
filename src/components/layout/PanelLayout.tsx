'use client'

import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ToastContainer from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { createContext, useContext } from 'react'
import type { ToastType } from '@/components/ui/Toast'

interface ToastContextType {
  showToast: (msg: string, type?: ToastType) => string
}

export const ToastContext = createContext<ToastContextType>({ showToast: () => '' })
export const useToastContext = () => useContext(ToastContext)

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { toasts, showToast, removeToast } = useToast()

  return (
    <ToastContext.Provider value={{ showToast }}>
      {/* Sidebar renders desktop sidebar + mobile bottom nav in one component */}
      <Sidebar />
      {/* Topbar renders desktop topbar + mobile top bar in one component */}
      <Topbar />

      {/* desktop: shift right of sidebar (w-56) and below topbar (h-16)
          mobile: body css in globals.css gives padding-top: 3.5rem (top bar h-14)
                  and padding-bottom: 4rem (bottom nav h-16) — no extra class needed */}
      <div className="lg:pl-56">
        <div id="page-content" className="lg:pt-16 min-h-screen">
          {children}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

// ~ https://github.com/thavanish edited this shitty code
