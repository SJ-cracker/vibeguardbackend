import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import cors from '@fastify/cors'
import { scanRoutes } from './routes/scans'
import { ensureStorageDirs } from './utils/storage'
// import './workers/analysisWorker' // Disabled for local execution without Redis

const fastify = Fastify({
  logger: true
})

// Register Multi-part for file uploads
fastify.register(multipart, {
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
})

fastify.register(cors, {
  origin: true // Allow all origins for dev, can restrict later
})

// Register API Routes
fastify.register(scanRoutes)

fastify.get('/v1/health', async function handler (request, reply) {
  return { status: 'ok', service: 'vibeguard-backend' }
})

import { execSync } from 'child_process'
import path from 'path'

const start = async () => {
  try {
    console.log('[Server] Syncing database schema...');
    try {
      const dbUrl = process.env.DATABASE_URL || 'file:' + path.resolve(__dirname, '../../../packages/database/prisma/dev.db');
      console.log('[Server] Using database URL for push:', dbUrl);
      execSync('npx prisma db push --schema=packages/database/prisma/schema.prisma', {
        env: { ...process.env, DATABASE_URL: dbUrl },
        stdio: 'inherit'
      });
    } catch (dbErr) {
      console.error('[Server] Database schema push warning:', dbErr);
    }
    await ensureStorageDirs();
    await fastify.listen({ port: 3001, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
