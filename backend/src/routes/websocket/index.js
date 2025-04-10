const { authenticateWebSocket } = require('../../controllers/auth-middleware');

/**
 * WebSocket Routes
 * 
 * Configures WebSocket endpoints for real-time communication
 * with performance optimizations and connection tracking.
 */
async function websocketRoutes(fastify, options) {
  // Main WebSocket endpoint for real-time updates
  fastify.get('/updates', { websocket: true }, async (connection, request) => {
    // Authenticate WebSocket connection
    const isAuthenticated = await authenticateWebSocket(connection, request);
    if (!isAuthenticated) {
      return; // Connection is closed by the authenticateWebSocket function
    }

    const userId = connection.user.id;
    const connectionId = `user:${userId}:${Date.now()}`;

    // Add connection to tracked connections
    fastify.ws.addConnection(connectionId, connection);
    
    // Send initial connection success message
    connection.socket.send(JSON.stringify({
      type: 'CONNECTED',
      userId: userId,
      timestamp: new Date().toISOString(),
    }));

    // Handle incoming messages
    connection.socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        fastify.log.info(`Received WebSocket message from ${userId}: ${data.type}`);
        
        // Handle different message types
        switch (data.type) {
          case 'PING':
            // Simple ping/pong for connection health check
            connection.socket.send(JSON.stringify({
              type: 'PONG',
              timestamp: new Date().toISOString(),
            }));
            break;
            
          case 'SUBSCRIBE_TASKS':
            // Mark this connection as subscribed to task updates
            connection.subscriptions = connection.subscriptions || {};
            connection.subscriptions.tasks = true;
            
            // Send confirmation
            connection.socket.send(JSON.stringify({
              type: 'SUBSCRIBED',
              channel: 'tasks',
              timestamp: new Date().toISOString(),
            }));
            break;
            
          case 'UNSUBSCRIBE_TASKS':
            // Remove task subscription
            if (connection.subscriptions) {
              connection.subscriptions.tasks = false;
            }
            
            // Send confirmation
            connection.socket.send(JSON.stringify({
              type: 'UNSUBSCRIBED',
              channel: 'tasks',
              timestamp: new Date().toISOString(),
            }));
            break;
            
          default:
            // Unknown message type
            connection.socket.send(JSON.stringify({
              type: 'ERROR',
              error: 'Unknown message type',
              timestamp: new Date().toISOString(),
            }));
        }
      } catch (error) {
        fastify.log.error(`WebSocket message error: ${error.message}`);
        
        // Send error response
        connection.socket.send(JSON.stringify({
          type: 'ERROR',
          error: 'Invalid message format',
          timestamp: new Date().toISOString(),
        }));
      }
    });

    // Handle connection close
    connection.socket.on('close', () => {
      fastify.log.info(`WebSocket connection closed for user ${userId}`);
      fastify.ws.removeConnection(connectionId);
    });
  });
}

module.exports = websocketRoutes; 