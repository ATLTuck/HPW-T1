const fastifyPlugin = require('fastify-plugin');
const fastifyWebsocket = require('@fastify/websocket');

/**
 * WebSocket plugin for Fastify
 * 
 * This plugin configures WebSocket support with performance optimizations
 * and provides connection management utilities.
 */
async function websocketPlugin(fastify, options) {
  // Register the WebSocket plugin with optimized settings
  await fastify.register(fastifyWebsocket, {
    options: {
      // Performance settings
      perMessageDeflate: {
        // Enable compression for better performance with text data
        zlibDeflateOptions: {
          level: 6, // Balance between speed and compression ratio
          memLevel: 8 // Higher memory for better compression
        },
        clientTracking: true,
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10, // Reduce memory usage
        concurrencyLimit: 10 // Limit concurrent processing
      },
      maxPayload: 1048576, // 1MB max message size
      // Connection timeout
      clientTracking: true, // Enable client tracking for broadcasting
    }
  });

  // Active connections storage
  const activeConnections = new Map();

  // WebSocket helpers
  fastify.decorate('ws', {
    // Add a connection to the active connections map
    addConnection: (id, connection) => {
      activeConnections.set(id, connection);
      fastify.log.info(`WebSocket connection added: ${id}`);
    },

    // Remove a connection from the active connections map
    removeConnection: (id) => {
      const removed = activeConnections.delete(id);
      if (removed) {
        fastify.log.info(`WebSocket connection removed: ${id}`);
      }
      return removed;
    },

    // Get a specific connection
    getConnection: (id) => {
      return activeConnections.get(id);
    },

    // Get all connections
    getAllConnections: () => {
      return Array.from(activeConnections.values());
    },

    // Get connections count
    getConnectionsCount: () => {
      return activeConnections.size;
    },

    // Broadcast a message to all active connections
    broadcast: (message, excludeId = null) => {
      const serializedMessage = typeof message === 'string' ? message : JSON.stringify(message);
      let sentCount = 0;
      
      activeConnections.forEach((connection, id) => {
        // Skip excluded connection
        if (excludeId && id === excludeId) {
          return;
        }
        
        // Only send to connections in OPEN state
        if (connection.socket.readyState === 1) { // WebSocket.OPEN
          connection.socket.send(serializedMessage);
          sentCount++;
        }
      });
      
      return sentCount;
    },

    // Broadcast to specific connections by filter function
    broadcastFiltered: (message, filterFn) => {
      const serializedMessage = typeof message === 'string' ? message : JSON.stringify(message);
      let sentCount = 0;
      
      activeConnections.forEach((connection, id) => {
        // Apply filter function
        if (filterFn(connection, id) && connection.socket.readyState === 1) {
          connection.socket.send(serializedMessage);
          sentCount++;
        }
      });
      
      return sentCount;
    }
  });

  // Set up periodic ping to keep connections alive
  const pingInterval = setInterval(() => {
    fastify.log.debug(`Sending ping to ${activeConnections.size} WebSocket clients`);
    activeConnections.forEach((connection, id) => {
      if (connection.socket.readyState === 1) { // WebSocket.OPEN
        connection.socket.ping();
      } else if (connection.socket.readyState >= 2) { // WebSocket.CLOSING or WebSocket.CLOSED
        fastify.ws.removeConnection(id);
      }
    });
  }, 30000); // every 30 seconds

  // Clean up on fastify close
  fastify.addHook('onClose', () => {
    clearInterval(pingInterval);
    
    // Close all active connections
    activeConnections.forEach((connection) => {
      try {
        connection.socket.close(1000, 'Server shutting down');
      } catch (err) {
        // Ignore errors during shutdown
      }
    });
    
    activeConnections.clear();
  });
}

module.exports = fastifyPlugin(websocketPlugin); 