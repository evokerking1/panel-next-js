export interface AuthUser {
  id: number
  email: string
  username: string
  isAdmin: boolean
  description: string
  avatar?: string | null
}

export interface AuthOptions {
  require?: boolean
  adminOnly?: boolean
}

interface AuthResponse {
  user?: AuthUser | null
  userCount?: number
}

export function needsRedirect(
  options: AuthOptions | undefined,
  data: AuthResponse,
) {
  if (options?.require && !data.user) {
    return data.userCount === 0 ? '/register' : '/login'
  }

  if (options?.adminOnly && data.user && !data.user.isAdmin) {
    return '/dashboard'
  }

  return null
}

export async function fetchCurrentUser() {
  return fetch('/api/auth/me').then((response) => response.json() as Promise<AuthResponse>)
}

export async function logoutUser() {
  await fetch('/api/auth/logout', { method: 'POST' })
}
