const UserController = require('../controllers/user-controller');
const TaskController = require('../controllers/task-controller');
const { authenticate } = require('../controllers/auth-middleware');

/**
 * API Routes
 * 
 * Registers all API endpoints with schema validation for 
 * improved performance and security.
 */
async function routes(fastify, options) {
  // Initialize controllers
  const userController = new UserController(fastify);
  const taskController = new TaskController(fastify);

  // Authentication routes
  fastify.route({
    method: 'POST',
    url: '/auth/register',
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            token: { type: 'string' },
          },
        },
      },
    },
    handler: userController.register.bind(userController),
  });

  fastify.route({
    method: 'POST',
    url: '/auth/login',
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            token: { type: 'string' },
          },
        },
      },
    },
    handler: userController.login.bind(userController),
  });

  fastify.route({
    method: 'POST',
    url: '/auth/logout',
    preHandler: authenticate,
    handler: userController.logout.bind(userController),
  });

  // User profile routes
  fastify.route({
    method: 'GET',
    url: '/profile',
    preHandler: authenticate,
    handler: userController.getProfile.bind(userController),
  });

  fastify.route({
    method: 'PUT',
    url: '/profile',
    preHandler: authenticate,
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    },
    handler: userController.updateProfile.bind(userController),
  });

  // Task routes
  fastify.route({
    method: 'GET',
    url: '/tasks',
    preHandler: authenticate,
    handler: taskController.getTasks.bind(taskController),
  });

  fastify.route({
    method: 'GET',
    url: '/tasks/:id',
    preHandler: authenticate,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    handler: taskController.getTask.bind(taskController),
  });

  fastify.route({
    method: 'POST',
    url: '/tasks',
    preHandler: authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
          priority: { type: 'integer', minimum: 0 },
          dueDate: { type: 'string', format: 'date-time' },
        },
      },
    },
    handler: taskController.createTask.bind(taskController),
  });

  fastify.route({
    method: 'PUT',
    url: '/tasks/:id',
    preHandler: authenticate,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
          priority: { type: 'integer', minimum: 0 },
          dueDate: { type: 'string', format: 'date-time' },
        },
      },
    },
    handler: taskController.updateTask.bind(taskController),
  });

  fastify.route({
    method: 'DELETE',
    url: '/tasks/:id',
    preHandler: authenticate,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    handler: taskController.deleteTask.bind(taskController),
  });
}

module.exports = routes; 