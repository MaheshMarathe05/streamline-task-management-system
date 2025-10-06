import mongoose from 'mongoose';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Team from '../models/Team.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// NOTE: Do NOT hash passwords manually here. The User model pre-save hook
// applies Argon2 hashing automatically. Manual hashing here would cause
// double hashing and make logins fail.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Sample users data
const usersData = [
  {
    name: 'John Manager',
    email: 'john.manager@gmail.com',
    password: 'Manager123!@',
    role: 'manager'
  },
  {
    name: 'Alice Developer',
    email: 'alice.dev@gmail.com',
    password: 'Alice123!@',
    role: 'employee'
  },
  {
    name: 'Bob Designer',
    email: 'bob.design@outlook.com',
    password: 'Bob123!@#',
    role: 'employee'
  },
  {
    name: 'Carol Tester',
    email: 'carol.test@yahoo.com',
    password: 'Carol123!@',
    role: 'employee'
  },
  {
    name: 'David Frontend',
    email: 'david.frontend@hotmail.com',
    password: 'David123!@',
    role: 'employee'
  }
];

// Sample projects data
const projectsData = [
  {
    name: 'E-commerce Website',
    description: 'Build a modern e-commerce platform with React and Node.js',
    status: 'Ongoing',
    priority: 'High',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    tags: ['web', 'react', 'nodejs', 'ecommerce']
  },
  {
    name: 'Mobile App Development',
    description: 'Create a cross-platform mobile app using React Native',
    status: 'Ongoing',
    priority: 'Medium',
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    tags: ['mobile', 'react-native', 'ios', 'android']
  },
  {
    name: 'Company Website Redesign',
    description: 'Redesign the company website with modern UI/UX',
    status: 'Completed',
    priority: 'Low',
    deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    tags: ['design', 'ui', 'ux', 'website']
  },
  {
    name: 'API Documentation Portal',
    description: 'Create a comprehensive API documentation portal',
    status: 'On Hold',
    priority: 'Medium',
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    tags: ['documentation', 'api', 'portal']
  }
];

// Sample tasks data
const tasksData = [
  // E-commerce Website tasks
  {
    title: 'Setup React Project Structure',
    description: 'Initialize React project with proper folder structure and configurations',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    estimatedHours: 8,
    actualHours: 6,
    tags: ['setup', 'react']
  },
  {
    title: 'Design Database Schema',
    description: 'Create database schema for products, users, and orders',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    estimatedHours: 12,
    actualHours: 10,
    tags: ['database', 'schema']
  },
  {
    title: 'Implement User Authentication',
    description: 'Build login, registration, and password reset functionality',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    estimatedHours: 16,
    tags: ['auth', 'security']
  },
  {
    title: 'Create Product Catalog',
    description: 'Build product listing, search, and filter functionality',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    estimatedHours: 20,
    tags: ['products', 'catalog']
  },
  {
    title: 'Implement Shopping Cart',
    description: 'Build shopping cart functionality with add/remove items',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    estimatedHours: 16,
    tags: ['cart', 'functionality']
  },
  // Mobile App tasks
  {
    title: 'Setup React Native Environment',
    description: 'Configure development environment for React Native',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    estimatedHours: 4,
    actualHours: 6,
    tags: ['setup', 'react-native']
  },
  {
    title: 'Design App Navigation',
    description: 'Create navigation structure and routing for the mobile app',
    status: 'In Progress',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    estimatedHours: 8,
    tags: ['navigation', 'design']
  },
  {
    title: 'Implement Login Screen',
    description: 'Create login and registration screens for mobile app',
    status: 'To Do',
    priority: 'High',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    estimatedHours: 12,
    tags: ['login', 'ui']
  }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Team.deleteMany({});
    
    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];
    
    for (const userData of usersData) {
      // Provide plain password; User model pre-save hook will hash it once.
      const user = await User.create({
        ...userData,
        twoFactor: {
          backupCodes: [] // We'll skip backup codes for seed data
        }
      });
      createdUsers.push(user);
      console.log(`   ✓ Created user: ${user.name} (${user.role})`);
    }
    
    const manager = createdUsers.find(u => u.role === 'manager');
    const employees = createdUsers.filter(u => u.role === 'employee');
    
    // Create a team
    console.log('👥 Creating development team...');
    const team = await Team.create({
      name: 'Development Team',
      manager: manager._id,
      members: employees.map(emp => emp._id)
    });
    console.log(`   ✓ Created team: ${team.name}`);
    
    // Create projects
    console.log('📁 Creating projects...');
    const createdProjects = [];
    
    for (let i = 0; i < projectsData.length; i++) {
      const projectData = projectsData[i];
      const project = await Project.create({
        ...projectData,
        manager: manager._id,
        team: team._id,
        members: employees.slice(0, 3).map((emp, index) => ({
          user: emp._id,
          role: index === 0 ? 'Developer' : index === 1 ? 'Designer' : 'Tester'
        })),
        activityLog: [{
          user: manager._id,
          action: 'Created project',
          details: `Project "${projectData.name}" was created`,
          timestamp: new Date()
        }]
      });
      createdProjects.push(project);
      console.log(`   ✓ Created project: ${project.name} (${project.status})`);
    }
    
    // Create tasks
    console.log('📋 Creating tasks...');
    const projectTaskMap = {
      0: [0, 1, 2, 3, 4], // E-commerce Website tasks
      1: [5, 6, 7], // Mobile App tasks
      2: [], // Company Website Redesign (completed, no active tasks)
      3: [] // API Documentation Portal (on hold, no active tasks)
    };
    
    for (let projectIndex = 0; projectIndex < createdProjects.length; projectIndex++) {
      const project = createdProjects[projectIndex];
      const taskIndices = projectTaskMap[projectIndex];
      
      for (const taskIndex of taskIndices) {
        const taskData = tasksData[taskIndex];
        const assignedEmployee = employees[taskIndex % employees.length];
        
        const task = await Task.create({
          ...taskData,
          project: project._id,
          assignedTo: assignedEmployee._id,
          comments: taskData.status === 'Done' ? [{
            user: assignedEmployee._id,
            text: 'Task completed successfully!',
            createdAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000)
          }] : []
        });
        
        console.log(`   ✓ Created task: ${task.title} (${task.status}) in ${project.name}`);
      }
    }
    
    // Add some project comments
    console.log('💬 Adding project comments...');
    for (const project of createdProjects) {
      if (project.status === 'Ongoing') {
        project.comments.push({
          user: manager._id,
          text: 'Project is progressing well. Keep up the good work!',
          createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
        });
        
        project.comments.push({
          user: employees[0]._id,
          text: 'Thanks! We are on track to meet the deadline.',
          createdAt: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000)
        });
        
        await project.save();
      }
    }
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Seeding Summary:');
    console.log(`   👥 Users: ${createdUsers.length}`);
    console.log(`   👥 Teams: 1`);
    console.log(`   📁 Projects: ${createdProjects.length}`);
    console.log(`   📋 Tasks: ${tasksData.length}`);
    
    console.log('\n🔐 Login Credentials:');
    console.log('   Manager: john.manager@gmail.com / Manager123!@');
    console.log('   Employee: alice.dev@gmail.com / Alice123!@');
    console.log('   Employee: bob.design@outlook.com / Bob123!@#');
    console.log('   Employee: carol.test@yahoo.com / Carol123!@');
    console.log('   Employee: david.frontend@hotmail.com / David123!@');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
};

// Run the seeding
seedDatabase();