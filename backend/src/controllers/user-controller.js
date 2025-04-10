const crypto = require('crypto');

/**
 * User Controller
 * 
 * Handles user authentication, registration, and user data operations
 * with performance optimizations and Redis caching.
 */
class UserController {
  constructor(fastify) {
    this.fastify = fastify;
    this.prisma = fastify.prisma;
    this.redis = fastify.redis;
  }

  /**
   * Simple password hashing - in production use bcrypt instead
   */
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Register a new user
   */
  async register(request, reply) {
    const { email, password, name } = request.body;

    try {
      // Check if user already exists (case insensitive)
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
        },
      });

      if (existingUser) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'Email already registered',
        });
      }

      // Create new user with hashed password
      const user = await this.prisma.user.create({
        data: {
          email,
          name,
          password: this.hashPassword(password),
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          // Don't return the password
        },
      });

      // Generate JWT token
      const token = this.fastify.jwt.sign({ id: user.id });

      // Return user data and token
      return reply.code(201).send({
        user,
        token,
      });
    } catch (error) {
      this.fastify.log.error(`Registration error: ${error.message}`);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Error registering user',
      });
    }
  }

  /**
   * Login a user
   */
  async login(request, reply) {
    const { email, password } = request.body;

    try {
      // Find user by email
      const user = await this.prisma.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
        },
      });

      // Check if user exists and password matches
      if (!user || user.password !== this.hashPassword(password)) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Generate JWT token
      const token = this.fastify.jwt.sign({ id: user.id });

      // Create a session record
      const session = await this.prisma.session.create({
        data: {
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        },
      });

      // Return user data and token (excluding password)
      return reply.code(200).send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        token,
      });
    } catch (error) {
      this.fastify.log.error(`Login error: ${error.message}`);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Error logging in',
      });
    }
  }

  /**
   * Get user profile with Redis caching
   */
  async getProfile(request, reply) {
    const userId = request.user.id;
    const cacheKey = `user:${userId}:profile`;

    try {
      // Try to get user from cache first
      const cachedUser = await this.fastify.cacheGet(cacheKey);
      
      if (cachedUser) {
        // Return cached user data
        return reply.code(200).send({
          user: JSON.parse(cachedUser),
          fromCache: true,
        });
      }

      // If not in cache, get from database
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          // Don't include password
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      // Store in cache for future requests (1 hour expiry)
      await this.fastify.cacheSet(cacheKey, JSON.stringify(user), 3600);

      return reply.code(200).send({
        user,
        fromCache: false,
      });
    } catch (error) {
      this.fastify.log.error(`Profile fetch error: ${error.message}`);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Error fetching user profile',
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(request, reply) {
    const userId = request.user.id;
    const { name } = request.body;
    const cacheKey = `user:${userId}:profile`;

    try {
      // Update user in database
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { name },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Invalidate cache
      await this.fastify.cacheDelete(cacheKey);

      return reply.code(200).send({
        user: updatedUser,
      });
    } catch (error) {
      this.fastify.log.error(`Profile update error: ${error.message}`);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Error updating user profile',
      });
    }
  }

  /**
   * Logout user
   */
  async logout(request, reply) {
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Missing token',
      });
    }

    try {
      // Remove session from database
      await this.prisma.session.deleteMany({
        where: { token },
      });

      return reply.code(200).send({
        message: 'Logged out successfully',
      });
    } catch (error) {
      this.fastify.log.error(`Logout error: ${error.message}`);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Error logging out',
      });
    }
  }
}

module.exports = UserController; 