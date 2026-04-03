'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2, Eye, EyeOff } from 'lucide-react'

const errorMessages: Record<string, string> = {
  invalid_credentials: 'Incorrect username or password.',
  account_locked: 'Account is locked due to too many failed attempts.',
  missing_fields: 'Please fill in all fields.',
}

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)
  const [settings, setSettings] = useState<{ title: string; logo: string; loginWallpaper?: string; allowRegistration: boolean } | null>(null)
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    const errParam = params.get('err')
    if (errParam && errorMessages[errParam]) setError(errorMessages[errParam])
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          router.replace('/dashboard')
          return
        }
        if (data.userCount === 0) {
          router.replace('/register')
          return
        }
      })
      .catch(() => {})
    fetch('/api/public/settings')
      .then(r => r.json())
      .then(d => { if (d) setSettings(d) })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: fd.get('identifier'), password: fd.get('password') }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'account_locked') {
          setError(`Account locked for ${data.wait} more minute(s).`)
        } else {
          setError(errorMessages[data.error] || 'Login failed.')
        }
        setLoading(false)
        return
      }
      router.push('/')
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const title = settings?.title || 'Airlink'
  const logo = settings?.logo || '/assets/logo.png'
  const wallpaper = settings?.loginWallpaper
  const allowReg = settings?.allowRegistration ?? false

  return (
    <div className="flex min-h-screen">
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 40px',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderRight: '1px solid rgba(0,0,0,0.08)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateX(0)' : 'translateX(-12px)',
          transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div className="mb-8">
          <img src={logo} alt="" className="h-10 w-10 rounded-xl object-contain mb-5" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Sign in</h1>
          <p className="text-sm text-neutral-500 mt-1">to {title}</p>
        </div>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 rounded-[10px] bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="identifier">
              Username or email
            </label>
            <input
              id="identifier" name="identifier" type="text" autoComplete="username"
              required spellCheck={false}
              className="w-full px-3.5 py-2.5 rounded-[10px] border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.08] text-[14px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none focus:border-neutral-400 dark:focus:border-white/[0.2] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)] transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password" name="password" type={showPassword ? 'text' : 'password'}
                autoComplete="current-password" required
                className="w-full px-3.5 py-2.5 pr-10 rounded-[10px] border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.08] text-[14px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none focus:border-neutral-400 dark:focus:border-white/[0.2] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)] transition-all"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                aria-label="Toggle password">
                {showPassword
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />
                }
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-[11px] rounded-[10px] bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 disabled:cursor-default transition-colors">
            {loading
              ? <Loader2 className="animate-spin h-5 w-5" />
              : 'Sign in'}
          </button>
        </form>

        {allowReg && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-neutral-800 dark:text-neutral-200 hover:underline">Create one</Link>
          </p>
        )}
      </div>

      <div className="hidden md:block flex-1 bg-neutral-100 dark:bg-neutral-900"
        style={wallpaper ? { background: `url('${wallpaper}') center/cover no-repeat` } : {}} />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
