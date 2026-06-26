import { PrismaClient } from '../dist/generated/client'
import path from 'path'

// Fallback to SQLite dev.db if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:' + path.resolve(__dirname, '../prisma/dev.db');
  console.log('[Prisma] Fallback DATABASE_URL set to:', process.env.DATABASE_URL);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export * from '../dist/generated/client'
