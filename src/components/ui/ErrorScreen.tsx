'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Home, LayoutDashboard, RefreshCw, ShieldAlert } from 'lucide-react'

type ErrorTone = 'default' | 'danger' | 'warning'

interface ErrorScreenProps {
  code: string
  title: string
  description: string
  tone?: ErrorTone
  retryLabel?: string
  onRetry?: () => void
}

export default function ErrorScreen({
  code,
  title,
  description,
  tone = 'default',
  retryLabel = 'Try again',
  onRetry,
}: ErrorScreenProps) {
  const router = useRouter()

  const accent = tone === 'danger'
    ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400'
    : tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'
      : 'border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300'

  const icon = tone === 'danger'
    ? <AlertTriangle className="h-5 w-5" />
    : tone === 'warning'
      ? <ShieldAlert className="h-5 w-5" />
      : <AlertTriangle className="h-5 w-5" />

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-800 dark:bg-[#141414] dark:text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-neutral-900/70">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${accent}`}>
            {icon}
            Error {code}
          </div>

          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Airlink Panel</p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-900 dark:text-white">{title}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500 dark:text-neutral-400">{description}</p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Link>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                <RefreshCw className="h-4 w-4" />
                {retryLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
