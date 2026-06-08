if (process.env.POSTGRES_PRISMA_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import cors from '@fastify/cors'
import { scanRoutes } from '../src/routes/scans'
import { ensureStorageDirs } from '../src/utils/storage'

const fastify = Fastify({
  logger: true
})

// Register Multi-part for file uploads
fastify.register(multipart, {
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
})

// Register CORS
fastify.register(cors, {
  origin: true
})

// Register API Routes
fastify.register(scanRoutes)

fastify.get('/v1/health', async function handler (request, reply) {
  return { status: 'ok', service: 'vibeguard-backend' }
})

export default async (req: any, res: any) => {
  await ensureStorageDirs();
  await fastify.ready();
  fastify.server.emit('request', req, res);
}
