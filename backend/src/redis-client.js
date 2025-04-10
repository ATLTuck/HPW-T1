const Redis = require('ioredis');
const fastifyPlugin = require('fastify-plugin');

/**
 * Redis client configuration
 * 
 * This module provides a Redis client with optimized connection settings
 * and helper methods for caching operations.
 */
async function redisPlugin(fastify, options) {
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    // Performance optimizations
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    connectTimeout: 10000, // 10 seconds
    // These settings help with connection reliability
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  };

  // Create the Redis client
  const redis = new Redis(redisConfig);

  // Add connection event handlers
  redis.on('connect', () => {
    fastify.log.info('Redis client connected');
  });
  
  redis.on('error', (err) => {
    fastify.log.error(`Redis error: ${err.message}`);
  });

  // Register redis client with fastify
  fastify.decorate('redis', redis);

  // Helper methods for caching
  fastify.decorate('cacheGet', async (key) => {
    return await redis.get(key);
  });

  fastify.decorate('cacheSet', async (key, value, expireSeconds = 3600) => {
    return await redis.set(key, value, 'EX', expireSeconds);
  });

  fastify.decorate('cacheDelete', async (key) => {
    return await redis.del(key);
  });

  // Clear cache by pattern (useful for invalidating related cache entries)
  fastify.decorate('cacheDeletePattern', async (pattern) => {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      return await redis.del(keys);
    }
    return 0;
  });

  // Add close hook to properly disconnect Redis on fastify close
  fastify.addHook('onClose', async (instance) => {
    fastify.log.info('Closing Redis connection');
    await redis.quit();
  });
}

module.exports = fastifyPlugin(redisPlugin); 