const fastify = require('fastify');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Environment variables should be loaded from .env in production
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Create and configure the Fastify server
 * 
 * This sets up a high-performance server with plugins for:
 * - CORS support
 * - JWT authentication
 * - WebSockets
 * - Redis caching
 * - Prisma database access
 */
async function buildServer() {
  // Create Fastify instance with performance optimizations
  const server = fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    // Performance optimizations
    bodyLimit: 1048576, // 1MB
    connectionTimeout: 60000, // 1 minute
    keepAliveTimeout: 30000, // 30 seconds
    pluginTimeout: 10000, // 10 seconds
    requestTimeout: 30000, // 30 seconds
    disableRequestLogging: process.env.NODE_ENV === 'production', // Disable request logging in production for performance
  });

  // Register global plugins
  await server.register(require('@fastify/cors'), {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await server.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'development-secret-key-change-in-production',
    sign: {
      expiresIn: '1h', // Token expires in 1 hour
    },
  });

  // Create and share Prisma client
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  server.decorate('prisma', prisma);

  // Close Prisma when server shuts down
  server.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
  });

  // Register WebSocket plugin
  await server.register(require('./plugins/websocket'));

  // Register Redis cache plugin
  await server.register(require('./redis-client'));

  // Register API routes
  await server.register(require('./routes'), { prefix: '/api' });

  // Register WebSocket routes
  await server.register(require('./routes/websocket'), { prefix: '/ws' });

  // Health check route - useful for monitoring
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Handle 404 errors
  server.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: 'Not Found', message: 'Route not found', statusCode: 404 });
  });

  // Handle server errors
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);
    
    // Don't expose internal server errors to the client in production
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : error.message;

    reply.code(statusCode).send({
      error: error.name || 'Error',
      message,
      statusCode,
    });
  });

  return server;
}

/**
 * Start the server
 */
async function startServer() {
  try {
    const server = await buildServer();
    await server.listen({ port: PORT, host: HOST });
    console.log(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

// If this file is run directly, start the server
if (require.main === module) {
  startServer();
}

// Export for testing
module.exports = { buildServer }; 