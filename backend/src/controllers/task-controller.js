/**
 * Task Controller
 * 
 * Handles CRUD operations for tasks with:
 * - Performance optimizations
 * - Redis caching
 * - WebSocket notifications for real-time updates
 */
class TaskController {
  constructor(fastify) {
    this.fastify = fastify;
    this.prisma = fastify.prisma;
  }

  /**
   * Get all tasks for the authenticated user
   * Uses Redis caching for improved performance
   */
  async getTasks(request, reply) {
    const userId = request.user.id;
    const cacheKey = `user:${userId}:tasks`;
    
    try {
      // Check cache first
      const cachedTasks = await this.fastify.cacheGet(cacheKey);
      
      if (cachedTasks) {
        return reply.code(200).send({
          tasks: JSON.parse(cachedTasks),
          fromCache: true,
        });
      }

      // If not in cache, query database
      const tasks = await this.prisma.task.findMany({
        where: {
          userId,
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      // Cache results (expire after 5 minutes)
      await this.fastify.cacheSet(cacheKey, JSON.stringify(tasks), 300);

      return reply.code(200).send({
        tasks,
        fromCache: false,
      });
    } catch (error) {
      this.fastify.log.error(`Error fetching tasks: ${error.message}`);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Error fetching tasks',
      });
    }
  }

  /**
   * Get a specific task by ID
   */
  async getTask(request, reply) {
    const { id } = request.params;
    const userId = request.user.id;
    const cacheKey = `task:${id}`;

    try {
      // Check cache first
      const cachedTask = await this.fastify.cacheGet(cacheKey);
      
      if (cachedTask) {
        const task = JSON.parse(cachedTask);
        
        // Verify task belongs to authenticated user
        if (task.userId !== userId) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to access this task',
          });
        }
        
        return reply.code(200).send({
          task,
          fromCache: true,
        });
      }

      // If not in cache, query database
      const task = await this.prisma.task.findUnique({
        where: {
          id,
        },
      });

      // Task not found
      if (!task) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Task not found',
        });
      }

      // Verify task belongs to authenticated user
      if (task.userId !== userId) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to access this task',
        });
      }

      // Cache results (expire after 5 minutes)
      await this.fastify.cacheSet(cacheKey, JSON.stringify(task), 300);

      return reply.code(200).send({
        task,
        fromCache: false,
      });
    } catch (error) {
      this.fastify.log.error(`Error fetching task: ${error.message}`);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Error fetching task',
      });
    }
  }

  /**
   * Create a new task
   * Sends real-time WebSocket notification
   */
  async createTask(request, reply) {
    const userId = request.user.id;
    const { title, description, status, priority, dueDate } = request.body;
    const userTasksCacheKey = `user:${userId}:tasks`;

    try {
      // Create new task
      const task = await this.prisma.task.create({
        data: {
          title,
          description,
          status: status || 'TODO',
          priority: priority || 0,
          dueDate: dueDate ? new Date(dueDate) : null,
          userId,
        },
      });

      // Invalidate related caches
      await this.fastify.cacheDelete(userTasksCacheKey);

      // Send real-time WebSocket notification
      this.fastify.ws.broadcastFiltered(
        {
          type: 'TASK_CREATED',
          task,
        },
        (connection) => {
          // Only send to connections of this user
          return connection.user && connection.user.id === userId;
        }
      );

      return reply.code(201).send({
        task,
      });
    } catch (error) {
      this.fastify.log.error(`Error creating task: ${error.message}`);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Error creating task',
      });
    }
  }

  /**
   * Update an existing task
   * Sends real-time WebSocket notification
   */
  async updateTask(request, reply) {
    const { id } = request.params;
    const userId = request.user.id;
    const { title, description, status, priority, dueDate } = request.body;
    const taskCacheKey = `task:${id}`;
    const userTasksCacheKey = `user:${userId}:tasks`;

    try {
      // Check if task exists and belongs to the user
      const existingTask = await this.prisma.task.findUnique({
        where: {
          id,
        },
      });

      if (!existingTask) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Task not found',
        });
      }

      if (existingTask.userId !== userId) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to update this task',
        });
      }

      // Update task
      const task = await this.prisma.task.update({
        where: {
          id,
        },
        data: {
          title: title !== undefined ? title : undefined,
          description: description !== undefined ? description : undefined,
          status: status !== undefined ? status : undefined,
          priority: priority !== undefined ? priority : undefined,
          dueDate: dueDate !== undefined ? new Date(dueDate) : undefined,
        },
      });

      // Invalidate related caches
      await this.fastify.cacheDelete(taskCacheKey);
      await this.fastify.cacheDelete(userTasksCacheKey);

      // Send real-time WebSocket notification
      this.fastify.ws.broadcastFiltered(
        {
          type: 'TASK_UPDATED',
          task,
        },
        (connection) => {
          // Only send to connections of this user
          return connection.user && connection.user.id === userId;
        }
      );

      return reply.code(200).send({
        task,
      });
    } catch (error) {
      this.fastify.log.error(`Error updating task: ${error.message}`);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Error updating task',
      });
    }
  }

  /**
   * Delete a task
   * Sends real-time WebSocket notification
   */
  async deleteTask(request, reply) {
    const { id } = request.params;
    const userId = request.user.id;
    const taskCacheKey = `task:${id}`;
    const userTasksCacheKey = `user:${userId}:tasks`;

    try {
      // Check if task exists and belongs to the user
      const existingTask = await this.prisma.task.findUnique({
        where: {
          id,
        },
      });

      if (!existingTask) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Task not found',
        });
      }

      if (existingTask.userId !== userId) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to delete this task',
        });
      }

      // Delete task
      await this.prisma.task.delete({
        where: {
          id,
        },
      });

      // Invalidate related caches
      await this.fastify.cacheDelete(taskCacheKey);
      await this.fastify.cacheDelete(userTasksCacheKey);

      // Send real-time WebSocket notification
      this.fastify.ws.broadcastFiltered(
        {
          type: 'TASK_DELETED',
          taskId: id,
        },
        (connection) => {
          // Only send to connections of this user
          return connection.user && connection.user.id === userId;
        }
      );

      return reply.code(200).send({
        message: 'Task deleted successfully',
      });
    } catch (error) {
      this.fastify.log.error(`Error deleting task: ${error.message}`);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Error deleting task',
      });
    }
  }
}

module.exports = TaskController; 