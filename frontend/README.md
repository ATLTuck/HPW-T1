# Performance-Critical Frontend

High-performance frontend for real-time web applications built with Solid.js and WebSockets.

## Architecture

This frontend is designed for maximum performance:

- **Solid.js**: A highly performant UI library with no Virtual DOM
- **WebSockets**: Real-time communication with the backend
- **Code Splitting**: Lazy-loaded routes for faster initial load
- **Reactive Primitives**: Efficient fine-grained reactivity model

## Features

- Highly optimized rendering with minimal DOM operations
- Real-time updates via WebSockets with automatic reconnection
- Optimistic UI updates for a responsive feel
- Lazy loading for improved initial load time
- Memory-efficient state management

## Performance Optimizations

### Component-Level Optimizations

- `createMemo` for computed values to avoid recalculations
- Signal-based state management for fine-grained updates
- Conditional rendering with `<Show>` to avoid DOM operations
- List rendering with `<For>` for efficient keyed updates

### Application-Level Optimizations

- Route-based code splitting with lazy loading
- Minimal dependency tree
- WebSocket connection pooling
- Error boundaries for stability
- Event delegation for better memory usage

### Build Optimizations

- Terser minification with advanced options
- Tree shaking to remove unused code
- Chunk splitting for better caching
- Preloading of critical resources

## Setup and Running

### Prerequisites

- Node.js (v16+)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Preview production build:
   ```bash
   npm run serve
   ```

## Core Components

### WebSocket Client

The WebSocket client (`src/websocket.js`) provides:

- Automatic reconnection with exponential backoff
- Authentication integration
- Event-based subscription model
- Connection state monitoring

### Component Structure

- **App.jsx**: Main application component with routing and auth state
- **components/**: Reusable UI components
  - **Header.jsx**: Navigation and WebSocket connection status
  - **Task.jsx**: Task display with optimized rendering
- **routes/**: Page components
  - **Dashboard.jsx**: Main task management screen with WebSocket integration
  - **TaskForm.jsx**: Task creation and editing
  - **Login.jsx/Register.jsx**: Authentication screens

## WebSocket Integration

### Connecting

```javascript
// Initialize and connect WebSocket client
const ws = getWebSocketClient();
ws.connect(authToken);
```

### Subscribing to Events

```javascript
// Subscribe to task updates
ws.subscribeToTasks();

// Listen for specific events
const unsubscribe = ws.on('task_created', (data) => {
  // Handle new task
});

// Clean up when done
unsubscribe();
```

### Handling Connection Status

```javascript
// Check connection status
if (ws.isConnected()) {
  // Connection is active
}

// Monitor status changes
ws.on('connected', () => {
  // Connection established
});

ws.on('disconnected', () => {
  // Connection lost
});
```

## Extending the Frontend

To add new features:

1. Create new components in `src/components/`
2. Add new routes in `src/routes/`
3. Connect to backend via fetch API or WebSockets
4. Update App.jsx with new routes

## Development Best Practices

- Use signals for state that changes over time
- Use memos for derived values
- Clean up event listeners and subscriptions with `onCleanup`
- Use lazy loading for routes
- Keep components small and focused 