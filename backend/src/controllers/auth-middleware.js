/**
 * Authentication Middleware
 * 
 * JWT-based authentication middleware with performance optimizations.
 * Verifies user token and attaches user information to the request.
 */

// Authenticate requests using JWT
async function authenticate(request, reply) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // Verify JWT token
      const decoded = request.server.jwt.verify(token);
      
      // Check if token is associated with a valid session
      const session = await request.server.prisma.session.findFirst({
        where: {
          token,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!session) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired session',
        });
      }

      // Attach user info to request for use in route handlers
      request.user = session.user;
      
      // Also validate that the user ID in the token matches the session user
      if (decoded.id !== session.user.id) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid authentication token',
        });
      }
    } catch (err) {
      // JWT verification failed
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid authentication token',
      });
    }
  } catch (error) {
    request.server.log.error(`Authentication error: ${error.message}`);
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Authentication error',
    });
  }
}

// WebSocket authentication handler
async function authenticateWebSocket(connection, request) {
  try {
    // Extract token from query parameters for WebSocket connections
    const token = request.query.token;
    
    if (!token) {
      connection.socket.close(1008, 'Authentication required');
      return false;
    }

    try {
      // Verify JWT token
      const decoded = request.server.jwt.verify(token);
      
      // Check if token is associated with a valid session
      const session = await request.server.prisma.session.findFirst({
        where: {
          token,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!session) {
        connection.socket.close(1008, 'Invalid or expired session');
        return false;
      }

      // Attach user info to connection for use in WebSocket handlers
      connection.user = session.user;
      
      // Also validate that the user ID in the token matches the session user
      if (decoded.id !== session.user.id) {
        connection.socket.close(1008, 'Invalid authentication token');
        return false;
      }
      
      return true;
    } catch (err) {
      // JWT verification failed
      connection.socket.close(1008, 'Invalid authentication token');
      return false;
    }
  } catch (error) {
    request.server.log.error(`WebSocket authentication error: ${error.message}`);
    connection.socket.close(1011, 'Internal server error');
    return false;
  }
}

module.exports = {
  authenticate,
  authenticateWebSocket,
}; 