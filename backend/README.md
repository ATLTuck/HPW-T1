# Performance-Critical Backend

High-performance backend for real-time web applications built with Fastify.js, PostgreSQL, Prisma ORM, and Redis.

## Architecture

This backend is designed for maximum performance and real-time capabilities:

- **Fastify.js**: Ultra-fast Node.js web framework with excellent performance characteristics
- **PostgreSQL**: Robust, scalable database with optimized schema design
- **Prisma ORM**: Type-safe database client with query optimization
- **Redis**: In-memory caching for improved response times
- **WebSockets**: Real-time communication with optimized connection handling

## Components

### Server Configuration

The server is configured with performance optimizations in `server.js`:
- Connection pooling
- Optimized request parsing
- Schema validation for improved performance
- Error handling

### API Routes

RESTful API endpoints with JWT authentication:
- User authentication (register, login, logout)
- User profile management
- Task management (CRUD operations)

### WebSockets

Real-time communication with:
- Authenticated connections
- Connection tracking and management
- Subscription-based updates
- Automatic reconnection support

### Caching Strategy

Redis is used for caching with:
- Request-level caching
- Invalidation on updates
- TTL-based expiration
- Optimized cache keys

## Setup and Running

### Prerequisites

- Node.js (v16+)
- PostgreSQL (v13+)
- Redis (v6+)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

4. Seed the database with sample data:
   ```bash
   npx prisma db seed
   ```

### Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Documentation

### Authentication

#### Register a new user
- **POST** `/api/auth/register`
- Body: `{ "email": "user@example.com", "password": "securepassword", "name": "User Name" }`

#### Login
- **POST** `/api/auth/login`
- Body: `{ "email": "user@example.com", "password": "securepassword" }`
- Returns: User data and JWT token

#### Logout
- **POST** `/api/auth/logout`
- Headers: `Authorization: Bearer <token>`

### User Profile

#### Get profile
- **GET** `/api/profile`
- Headers: `Authorization: Bearer <token>`

#### Update profile
- **PUT** `/api/profile`
- Headers: `Authorization: Bearer <token>`
- Body: `{ "name": "Updated Name" }`

### Tasks

#### Get all tasks
- **GET** `/api/tasks`
- Headers: `Authorization: Bearer <token>`

#### Get a specific task
- **GET** `/api/tasks/:id`
- Headers: `Authorization: Bearer <token>`

#### Create a task
- **POST** `/api/tasks`
- Headers: `Authorization: Bearer <token>`
- Body: `{ "title": "Task Title", "description": "Task Description", "status": "TODO", "priority": 1 }`

#### Update a task
- **PUT** `/api/tasks/:id`
- Headers: `Authorization: Bearer <token>`
- Body: `{ "status": "IN_PROGRESS" }`

#### Delete a task
- **DELETE** `/api/tasks/:id`
- Headers: `Authorization: Bearer <token>`

## WebSocket Documentation

### Connection

Connect to the WebSocket endpoint:
```javascript
const socket = new WebSocket('ws://localhost:8080/ws/updates?token=<jwt-token>');
```

### Messages

#### Ping/Pong
```javascript
// Send ping
socket.send(JSON.stringify({ type: 'PING' }));

// Receive pong
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'PONG') {
    console.log('Received pong at', data.timestamp);
  }
};
```

#### Subscribe to task updates
```javascript
// Subscribe
socket.send(JSON.stringify({ type: 'SUBSCRIBE_TASKS' }));

// Unsubscribe
socket.send(JSON.stringify({ type: 'UNSUBSCRIBE_TASKS' }));

// Receive task updates
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'TASK_CREATED' || data.type === 'TASK_UPDATED' || data.type === 'TASK_DELETED') {
    console.log('Task update:', data);
  }
};
```

## Performance Considerations

### Database Optimizations
- Indexes on frequently queried fields
- UUID primary keys for security and distribution
- Compound indexes for common query patterns

### Caching Strategy
- Cache invalidation on write operations
- TTL-based expiration for automatic freshness
- Selective caching for high-impact queries

### WebSocket Optimizations
- Connection pooling
- Message compression
- Heartbeat mechanism
- Authentication token validation

## Extending the Backend

To add new features:
1. Create a new controller in `src/controllers/`
2. Add new routes in `src/routes/`
3. Update the Prisma schema if needed
4. Add WebSocket handlers for real-time updates 