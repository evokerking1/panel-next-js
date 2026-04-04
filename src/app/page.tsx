import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session/index'
import prisma from '@/lib/prisma'

export default async function Root() {
  let userCount = 0

  try {
    userCount = await prisma.users.count()
  } catch {
    // db not ready, treat as empty so setup can proceed
  }

  if (userCount === 0) {
    redirect('/register')
  }

  const session = await getSession()
  if (session.user) {
    redirect('/dashboard')
  }

  redirect('/login')
}


