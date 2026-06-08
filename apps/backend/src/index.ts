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

const start = async () => {
  try {
    await ensureStorageDirs();
    await fastify.listen({ port: 3001, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
