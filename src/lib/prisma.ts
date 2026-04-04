import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { ensureEnvLoaded } from './env'

ensureEnvLoaded()

function resolveDbUrl() {
  const raw = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
  if (!raw.startsWith('file:')) return raw
  const filePath = raw.slice('file:'.length)
  return `file:${path.resolve(filePath)}`
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: resolveDbUrl() } },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
