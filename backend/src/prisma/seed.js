// Database seeding script for development environment

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

// Simple password hashing for demo purposes
// In production, use a proper hashing library like bcrypt
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Starting database seed...');

  // Cleanup existing data in reverse order of dependencies
  await prisma.session.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Database cleaned. Creating sample users...');

  // Create sample users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        password: hashPassword('admin123'), // In a real app, use proper password hashing
      },
    }),
    prisma.user.create({
      data: {
        email: 'user@example.com',
        name: 'Regular User',
        password: hashPassword('user123'),
      },
    }),
  ]);

  console.log(`Created ${users.length} users. Creating sample tasks...`);

  // Create sample tasks
  const tasks = await Promise.all([
    // Tasks for first user
    prisma.task.create({
      data: {
        title: 'Complete project setup',
        description: 'Set up all initial configurations for the project',
        status: 'IN_PROGRESS',
        priority: 2,
        dueDate: new Date(Date.now() + 86400000), // Tomorrow
        userId: users[0].id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Draft project proposal',
        description: 'Create initial project proposal document with requirements',
        status: 'TODO',
        priority: 1,
        dueDate: new Date(Date.now() + 2 * 86400000), // Day after tomorrow
        userId: users[0].id,
      },
    }),
    
    // Tasks for second user
    prisma.task.create({
      data: {
        title: 'Review documentation',
        description: 'Review all documentation for accuracy and completeness',
        status: 'TODO',
        priority: 3,
        dueDate: new Date(Date.now() + 3 * 86400000),
        userId: users[1].id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Submit progress report',
        description: 'Prepare and submit weekly progress report',
        status: 'DONE',
        priority: 2,
        dueDate: new Date(Date.now() - 86400000), // Yesterday
        userId: users[1].id,
      },
    }),
  ]);

  console.log(`Created ${tasks.length} tasks.`);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 