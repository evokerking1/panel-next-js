'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthOptions, AuthUser, fetchCurrentUser, logoutUser, needsRedirect } from './auth-client'

export function useAuth(options?: AuthOptions) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadAuth() {
      try {
        const data = await fetchCurrentUser()
        setUser(data.user ?? null)
        const redirectPath = needsRedirect(options, data)
        if (redirectPath) {
          router.replace(redirectPath)
        } else {
          setLoading(false)
        }
      } catch {
        setUser(null)
        setLoading(false)
        if (options?.require) router.replace('/login')
      }
    }

    void loadAuth()
  }, [options?.adminOnly, options?.require, router])

  async function logout() {
    await logoutUser()
    router.push('/login')
  }

  return { user, loading, logout }
}
