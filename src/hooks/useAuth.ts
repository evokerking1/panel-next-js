'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export interface AuthUser {
  id: number
  email: string
  username: string
  isAdmin: boolean
  description: string
}

export function useAuth(options?: { require?: boolean; adminOnly?: boolean }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        setUser(data.user ?? null)
        if (options?.require && !data.user) {
          if (data.userCount === 0) {
            router.replace('/register')
          } else {
            router.replace('/login')
          }
          setLoading(false)
          return
        }
        if (options?.adminOnly && data.user && !data.user.isAdmin) {
          router.replace('/dashboard')
          setLoading(false)
          return
        }
        setLoading(false)
      })
      .catch(() => {
        setUser(null)
        setLoading(false)
        if (options?.require) router.replace('/login')
      })
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return { user, loading, logout }
}
