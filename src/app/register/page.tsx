'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw.length) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score: 25, label: 'Weak', color: '#ef4444' }
  if (score === 2) return { score: 50, label: 'Fair', color: '#f59e0b' }
  if (score === 3) return { score: 75, label: 'Good', color: '#3b82f6' }
  return { score: 100, label: 'Strong', color: '#10b981' }
}

const inputClass = "w-full px-3.5 py-2.5 rounded-[10px] border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.08] text-[14px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none focus:border-neutral-400 dark:focus:border-white/[0.2] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)] dark:focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)] transition-all"

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)
  const [settings, setSettings] = useState<{ title: string; logo: string; registerWallpaper?: string; loginWallpaper?: string; allowRegistration?: boolean } | null>(null)
  const router = useRouter()
  const strength = passwordStrength(password)

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/public/settings').then(r => r.json()),
    ]).then(([auth, cfg]) => {
      if (auth.user) {
        router.replace('/dashboard')
        return
      }
      if (auth.userCount > 0 && !cfg.allowRegistration) {
        router.replace('/login')
        return
      }
      if (cfg) setSettings(cfg)
    }).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fd.get('email'), username: fd.get('username'), password: fd.get('password') }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msgs: Record<string, string> = {
          missing_fields: 'Please fill in all fields.',
          invalid_input: 'Invalid email or password format.',
          invalid_username: 'Username must be 3–20 alphanumeric characters.',
          user_exists: 'Email or username already taken.',
          registration_disabled: 'Registration is disabled.',
        }
        setError(msgs[data.error] || 'Registration failed.')
        setLoading(false)
        return
      }
      router.push('/login')
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell flex min-h-screen flex-col md:flex-row">
      <div style={{
        width: '100%', maxWidth: 460, flexShrink: 0, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '48px 40px',
        opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-12px)',
        transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}
      className="relative z-10 flex min-h-screen w-full justify-center border-r border-neutral-200 bg-white md:max-w-[460px] dark:border-white/[0.08] dark:bg-[#141414] md:backdrop-blur-none max-md:bg-white/90 max-md:backdrop-blur-xl max-md:dark:bg-[#141414]/90">
        <div className="mb-8">
          <img src={settings?.logo || '/assets/logo.png'} alt="" className="h-10 w-10 rounded-xl object-contain mb-5" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Create account</h1>
          <p className="text-sm text-neutral-500 mt-1">Join {settings?.title || 'Airlink'}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-500">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="username">Username</label>
            <input id="username" name="username" type="text" autoComplete="username" required className={inputClass} placeholder="yourname" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required
                className={inputClass + ' pr-10'} placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors" aria-label="Toggle password">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {strength.label && (
              <div className="mt-2">
                <div className="h-1 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${strength.score}%`, background: strength.color }} />
                </div>
                <p className="text-[11px] mt-1" style={{ color: strength.color }}>{strength.label}</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[13px] font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="confirmPassword">Confirm password</label>
            <div className="relative">
              <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required
                className={inputClass + ' pr-10'} placeholder="••••••••"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors" aria-label="Toggle confirm password">
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-[11px] rounded-[10px] bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 disabled:cursor-default transition-colors">
            {loading
              ? <Loader2 className="animate-spin h-5 w-5" />
              : 'Create account'}
          </button>
        </form>

        {settings?.allowRegistration !== false && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-6">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-neutral-800 dark:text-neutral-200 hover:underline">Sign in</Link>
          </p>
        )}
      </div>
      <div
        className="fixed inset-0 md:static md:flex-1 bg-neutral-100 dark:bg-neutral-900"
        style={settings?.registerWallpaper || settings?.loginWallpaper ? { background: `url('${settings?.registerWallpaper || settings?.loginWallpaper}') center/cover no-repeat` } : {}}
      />
    </div>
  )
}
