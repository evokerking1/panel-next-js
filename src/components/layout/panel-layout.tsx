'use client'

import Sidebar from './sidebar'
import Topbar from './topbar'
import ToastContainer from '@/components/ui/toast'
import { useToast } from '@/hooks/useToast'
import { createContext, useContext } from 'react'
import type { ToastType } from '@/components/ui/toast'

interface ToastContextType {
  showToast: (msg: string, type?: ToastType) => string
}

const ToastContext = createContext<ToastContextType>({ showToast: () => '' })
export const useToastContext = () => useContext(ToastContext)

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { toasts, showToast, removeToast } = useToast()

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Sidebar />
      <Topbar />

      <div className="panel-shell">
        <div id="page-content" className="panel-content">
          {children}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}
