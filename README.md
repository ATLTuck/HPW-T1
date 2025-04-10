# Performance-Critical Real-Time Web Application Starter

A high-performance, production-ready starter repository for building real-time interactive web applications with maximum performance, simplicity, and reliability.

## Features

- **High Performance**: Optimized stack with Solid.js frontend and Fastify backend
- **Real-time Capabilities**: WebSocket implementation for instant updates
- **Data Persistence**: PostgreSQL with Prisma ORM for type-safe database access
- **Caching**: Redis integration for optimal performance
- **Local Development**: Runs entirely locally without cloud dependencies
- **Production Ready**: Comprehensive security implementations

## Architecture

- **Frontend**: Solid.js for reactive UI with minimal overhead
- **Backend**: Fastify.js for high-performance Node.js server
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: WebSocket communication via Fastify-WebSocket
- **Caching**: Redis for performance optimization

## Prerequisites

- Node.js (v16+)
- PostgreSQL (v13+)
- Redis (v6+)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/performance-critical-webapp-starter.git
   cd performance-critical-webapp-starter
   ```

2. **Set up the database**
   ```bash
   # Start PostgreSQL
   # Create a database named 'app_db' or update prisma schema with your DB name
   ```

3. **Setup backend**
   ```bash
   cd backend
   npm install
   
   # Configure environment
   cp .env.example .env
   # Edit .env with your database connection string
   
   # Setup database schema
   npx prisma migrate dev
   
   # Seed the database
   npx prisma db seed
   
   # Start the development server
   npm run dev
   ```

4. **Setup frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080

## Development

For detailed documentation:

- See [frontend/README.md](./frontend/README.md) for frontend development
- See [backend/README.md](./backend/README.md) for backend development

## Performance Optimizations

This starter includes various performance enhancements:

- Efficient Solid.js reactivity system (no Virtual DOM)
- Optimized Fastify routes with schema validation
- Strategic database indexing
- Redis caching implementation
- WebSocket connection pooling
- Lazy-loaded frontend routes

## License

MIT 