import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 1,
  retryStrategy: () => null
});

redisConnection.on('error', () => console.warn('Redis error: Please start Redis to enable job queueing.'));

export const scanQueue = new Queue('scan-jobs', { connection: redisConnection as any });