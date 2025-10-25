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

// Sample users data with Indian names
const usersData = [
  // Managers
  {
    name: 'Mahesh Marathe',
    email: 'maheshmarathe@gmail.com',
    password: 'Mahesh123!@',
    role: 'manager'
  },
  {
    name: 'Raj Kadam',
    email: 'rajkadam@outlook.com',
    password: 'Raj123!@',
    role: 'manager'
  },
  // Senior Developers
  {
    name: 'Dhruv Mankame',
    email: 'dhruvmankame@gmail.com',
    password: 'Dhruv123!@',
    role: 'employee'
  },
  {
    name: 'Dharmendra Maurya',
    email: 'dharmendramaurya@yahoo.com',
    password: 'Dharmendra123!@',
    role: 'employee'
  },
  {
    name: 'Sahil',
    email: 'vsahil@gmail.com',
    password: 'Sahil123!@',
    role: 'employee'
  },
  // Developers
  {
    name: 'Ananya Gupta',
    email: 'ananyagupta@outlook.com',
    password: 'Ananya123!@',
    role: 'employee'
  },
  {
    name: 'Akshat Madheshiya',
    email: 'akshatmadheshiya@gmail.com',
    password: 'Akshat123!@',
    role: 'employee'
  },
  {
    name: 'Kavya Nair',
    email: 'kavyanair@yahoo.com',
    password: 'Kavya123!@',
    role: 'employee'
  },
  // Designers
  {
    name: 'Pratik Maurya',
    email: 'pratikmaurya@gmail.com',
    password: 'Pratik123!@',
    role: 'employee'
  },
  {
    name: 'Ishita Joshi',
    email: 'ishitajoshi@outlook.com',
    password: 'Ishita123!@',
    role: 'employee'
  },
  // Testers/QA
  {
    name: 'Karan Kare',
    email: 'karankare@gmail.com',
    password: 'Karan123!@',
    role: 'employee'
  },
  {
    name: 'Neha Iyer',
    email: 'nehaiyer@yahoo.com',
    password: 'Neha123!@',
    role: 'employee'
  },
  // DevOps
  {
    name: 'Siddharth Rao',
    email: 'siddharthrao@gmail.com',
    password: 'Siddharth123!@',
    role: 'employee'
  }
];

// Sample projects data - Indian company context
const projectsData = [
  {
    name: 'Bharat E-Commerce Platform',
    description: 'Building India\'s next-generation e-commerce platform with multi-language support and UPI integration',
    status: 'Ongoing',
    priority: 'High',
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    tags: ['ecommerce', 'react', 'nodejs', 'upi', 'multilingual']
  },
  {
    name: 'Digital India Mobile App',
    description: 'Cross-platform mobile application for government services with Aadhaar integration',
    status: 'Ongoing',
    priority: 'High',
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    tags: ['mobile', 'react-native', 'government', 'aadhaar']
  },
  {
    name: 'Smart City Dashboard',
    description: 'Real-time analytics dashboard for smart city infrastructure monitoring',
    status: 'Ongoing',
    priority: 'Medium',
    deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    tags: ['iot', 'analytics', 'dashboard', 'smart-city']
  },
  {
    name: 'FinTech Payment Gateway',
    description: 'Secure payment gateway supporting UPI, cards, net banking with fraud detection',
    status: 'Ongoing',
    priority: 'High',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    tags: ['fintech', 'payments', 'upi', 'security']
  },
  {
    name: 'EdTech Learning Platform',
    description: 'Online education platform with live classes, assignments, and progress tracking',
    status: 'Ongoing',
    priority: 'Medium',
    deadline: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
    tags: ['edtech', 'education', 'video', 'learning']
  },
  {
    name: 'Healthcare Management System',
    description: 'Hospital management system with patient records, appointments, and billing',
    status: 'Completed',
    priority: 'High',
    deadline: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    tags: ['healthcare', 'hospital', 'medical', 'erp']
  },
  {
    name: 'Agri-Tech Supply Chain',
    description: 'Blockchain-based supply chain management for agricultural products',
    status: 'Ongoing',
    priority: 'Medium',
    deadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    tags: ['agriculture', 'blockchain', 'supply-chain']
  },
  {
    name: 'Travel & Tourism Portal',
    description: 'Complete travel booking platform with hotels, flights, and tour packages',
    status: 'Completed',
    priority: 'Medium',
    deadline: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    tags: ['travel', 'tourism', 'booking', 'hotels']
  },
  {
    name: 'Corporate Website Redesign',
    description: 'Modern responsive website redesign with CMS integration',
    status: 'On Hold',
    priority: 'Low',
    deadline: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    tags: ['website', 'redesign', 'cms', 'corporate']
  },
  {
    name: 'AI Chatbot Integration',
    description: 'Multilingual AI chatbot for customer support with NLP capabilities',
    status: 'Ongoing',
    priority: 'Medium',
    deadline: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
    tags: ['ai', 'chatbot', 'nlp', 'customer-support']
  }
];

// Sample tasks data - Comprehensive task list for all projects
const tasksData = [
  // Bharat E-Commerce Platform tasks (Project 0)
  {
    title: 'Setup React Project with TypeScript',
    description: 'Initialize React project with TypeScript, ESLint, and Prettier configurations',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    estimatedHours: 8,
    actualHours: 6,
    tags: ['setup', 'react', 'typescript']
  },
  {
    title: 'Design MongoDB Schema for Products',
    description: 'Create comprehensive database schema for products, categories, and inventory',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    estimatedHours: 12,
    actualHours: 14,
    tags: ['database', 'schema', 'mongodb']
  },
  {
    title: 'Implement UPI Payment Integration',
    description: 'Integrate UPI payment gateway with callback handling and verification',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    estimatedHours: 24,
    tags: ['payment', 'upi', 'integration']
  },
  {
    title: 'Multi-language Support Setup',
    description: 'Implement i18n for Hindi, English, Tamil, Telugu, and Bengali',
    status: 'In Progress',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    estimatedHours: 20,
    tags: ['i18n', 'multilingual', 'localization']
  },
  {
    title: 'Product Catalog UI Development',
    description: 'Build responsive product listing, filtering, and search interface',
    status: 'To Do',
    priority: 'High',
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    estimatedHours: 32,
    tags: ['ui', 'catalog', 'frontend']
  },
  {
    title: 'Shopping Cart & Checkout Flow',
    description: 'Develop shopping cart with saved items and multi-step checkout',
    status: 'To Do',
    priority: 'High',
    dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    estimatedHours: 28,
    tags: ['cart', 'checkout', 'functionality']
  },
  {
    title: 'Order Management Dashboard',
    description: 'Admin dashboard for order tracking, fulfillment, and returns',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    estimatedHours: 24,
    tags: ['admin', 'orders', 'dashboard']
  },

  // Digital India Mobile App tasks (Project 1)
  {
    title: 'React Native Project Setup',
    description: 'Initialize React Native project with navigation and state management',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    estimatedHours: 10,
    actualHours: 12,
    tags: ['setup', 'react-native', 'mobile']
  },
  {
    title: 'Aadhaar Authentication Integration',
    description: 'Implement Aadhaar-based biometric authentication',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    estimatedHours: 30,
    tags: ['aadhaar', 'authentication', 'security']
  },
  {
    title: 'Government Services Module',
    description: 'Build interface for accessing various government services',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    estimatedHours: 40,
    tags: ['services', 'government', 'ui']
  },
  {
    title: 'Document Upload & Verification',
    description: 'Feature for uploading and verifying government documents',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    estimatedHours: 25,
    tags: ['documents', 'upload', 'verification']
  },
  {
    title: 'Push Notifications Setup',
    description: 'Configure Firebase for push notifications and alerts',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
    estimatedHours: 16,
    tags: ['notifications', 'firebase', 'alerts']
  },

  // Smart City Dashboard tasks (Project 2)
  {
    title: 'IoT Data Collection Setup',
    description: 'Setup MQTT broker for real-time IoT sensor data collection',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    estimatedHours: 20,
    actualHours: 18,
    tags: ['iot', 'mqtt', 'sensors']
  },
  {
    title: 'Real-time Analytics Dashboard',
    description: 'Build dashboard with real-time charts for traffic, pollution, utilities',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    estimatedHours: 35,
    tags: ['analytics', 'dashboard', 'realtime']
  },
  {
    title: 'Alert & Notification System',
    description: 'Automated alert system for anomalies and critical events',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    estimatedHours: 22,
    tags: ['alerts', 'notifications', 'automation']
  },
  {
    title: 'Historical Data Analysis',
    description: 'ML-based predictive analytics on historical city data',
    status: 'To Do',
    priority: 'Low',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    estimatedHours: 40,
    tags: ['ml', 'analytics', 'prediction']
  },

  // FinTech Payment Gateway tasks (Project 3)
  {
    title: 'Payment Gateway Architecture Design',
    description: 'Design secure, scalable architecture for payment processing',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    estimatedHours: 16,
    actualHours: 20,
    tags: ['architecture', 'design', 'security']
  },
  {
    title: 'UPI Integration Module',
    description: 'Develop UPI payment collection and verification module',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    estimatedHours: 28,
    actualHours: 30,
    tags: ['upi', 'payment', 'integration']
  },
  {
    title: 'Card Payment Processing',
    description: 'Implement credit/debit card payment with PCI DSS compliance',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    estimatedHours: 35,
    tags: ['cards', 'pci-dss', 'compliance']
  },
  {
    title: 'Fraud Detection System',
    description: 'ML-based fraud detection and risk assessment engine',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    estimatedHours: 45,
    tags: ['fraud', 'ml', 'security']
  },
  {
    title: 'Transaction Reconciliation',
    description: 'Automated daily reconciliation and settlement processing',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    estimatedHours: 25,
    tags: ['reconciliation', 'settlement', 'automation']
  },

  // EdTech Learning Platform tasks (Project 4)
  {
    title: 'Video Streaming Infrastructure',
    description: 'Setup CDN and adaptive bitrate streaming for live classes',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    estimatedHours: 30,
    actualHours: 28,
    tags: ['video', 'streaming', 'cdn']
  },
  {
    title: 'Interactive Whiteboard',
    description: 'Real-time collaborative whiteboard for online teaching',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    estimatedHours: 40,
    tags: ['whiteboard', 'realtime', 'collaboration']
  },
  {
    title: 'Assignment Submission Portal',
    description: 'Student portal for assignment submission and grading',
    status: 'In Progress',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    estimatedHours: 28,
    tags: ['assignments', 'grading', 'portal']
  },
  {
    title: 'Progress Tracking Dashboard',
    description: 'Analytics dashboard for student performance and attendance',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    estimatedHours: 32,
    tags: ['analytics', 'progress', 'dashboard']
  },
  {
    title: 'Quiz & Assessment Module',
    description: 'Automated quiz system with various question types and auto-grading',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    estimatedHours: 35,
    tags: ['quiz', 'assessment', 'automation']
  },

  // Healthcare Management System tasks (Project 5 - Completed)
  {
    title: 'Patient Registration System',
    description: 'Complete patient registration with demographics and medical history',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    estimatedHours: 25,
    actualHours: 24,
    tags: ['patient', 'registration', 'medical']
  },
  {
    title: 'Appointment Scheduling',
    description: 'Doctor appointment booking with calendar integration',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
    estimatedHours: 20,
    actualHours: 22,
    tags: ['appointments', 'scheduling', 'calendar']
  },
  {
    title: 'Electronic Health Records',
    description: 'Secure EHR system with HIPAA compliance',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    estimatedHours: 45,
    actualHours: 48,
    tags: ['ehr', 'hipaa', 'security']
  },
  {
    title: 'Billing & Insurance Module',
    description: 'Automated billing with insurance claim processing',
    status: 'Done',
    priority: 'Medium',
    dueDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
    estimatedHours: 30,
    actualHours: 32,
    tags: ['billing', 'insurance', 'automation']
  },

  // Agri-Tech Supply Chain tasks (Project 6)
  {
    title: 'Blockchain Network Setup',
    description: 'Setup Hyperledger Fabric network for supply chain tracking',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    estimatedHours: 35,
    actualHours: 40,
    tags: ['blockchain', 'hyperledger', 'setup']
  },
  {
    title: 'Smart Contract Development',
    description: 'Chaincode for product tracking from farm to consumer',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    estimatedHours: 40,
    tags: ['smart-contract', 'chaincode', 'blockchain']
  },
  {
    title: 'Farmer Mobile App',
    description: 'Mobile app for farmers to list products and track shipments',
    status: 'To Do',
    priority: 'High',
    dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    estimatedHours: 45,
    tags: ['mobile', 'farmer', 'tracking']
  },
  {
    title: 'QR Code Product Verification',
    description: 'QR-based product authenticity verification for consumers',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    estimatedHours: 20,
    tags: ['qr-code', 'verification', 'consumer']
  },

  // Travel & Tourism Portal tasks (Project 7 - Completed)
  {
    title: 'Hotel Booking Engine',
    description: 'Integration with multiple hotel booking APIs',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    estimatedHours: 38,
    actualHours: 40,
    tags: ['hotels', 'booking', 'api']
  },
  {
    title: 'Flight Search & Booking',
    description: 'Flight search with price comparison and booking',
    status: 'Done',
    priority: 'High',
    dueDate: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000),
    estimatedHours: 42,
    actualHours: 45,
    tags: ['flights', 'booking', 'search']
  },
  {
    title: 'Tour Package Builder',
    description: 'Customizable tour package creation and management',
    status: 'Done',
    priority: 'Medium',
    dueDate: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
    estimatedHours: 32,
    actualHours: 30,
    tags: ['tours', 'packages', 'builder']
  },

  // AI Chatbot Integration tasks (Project 9)
  {
    title: 'NLP Model Training',
    description: 'Train multilingual NLP model for intent recognition',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    estimatedHours: 50,
    tags: ['nlp', 'ml', 'training']
  },
  {
    title: 'Chat Widget Integration',
    description: 'Responsive chat widget for web and mobile platforms',
    status: 'In Progress',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    estimatedHours: 24,
    tags: ['chatbot', 'widget', 'ui']
  },
  {
    title: 'Knowledge Base Integration',
    description: 'Connect chatbot with company knowledge base and FAQs',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    estimatedHours: 28,
    tags: ['knowledge-base', 'faq', 'integration']
  },
  {
    title: 'Analytics Dashboard',
    description: 'Conversation analytics and customer insights dashboard',
    status: 'To Do',
    priority: 'Low',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    estimatedHours: 20,
    tags: ['analytics', 'insights', 'dashboard']
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
    
    const managers = createdUsers.filter(u => u.role === 'manager');
    const employees = createdUsers.filter(u => u.role === 'employee');
    
    // Create multiple teams
    console.log('👥 Creating development teams...');
    const teams = [];
    
    const teamData = [
      { name: 'Frontend Development Team', manager: managers[0]._id, memberIndices: [0, 1, 6, 8] },
      { name: 'Backend Development Team', manager: managers[1]._id, memberIndices: [2, 3, 4, 10] },
      { name: 'Mobile Development Team', manager: managers[0]._id, memberIndices: [5, 6, 7] },
      { name: 'DevOps & QA Team', manager: managers[1]._id, memberIndices: [9, 10] }
    ];
    
    for (const teamInfo of teamData) {
      const team = await Team.create({
        name: teamInfo.name,
        manager: teamInfo.manager,
        members: teamInfo.memberIndices.map(i => employees[i]._id)
      });
      teams.push(team);
      console.log(`   ✓ Created team: ${team.name}`);
    }
    
    // Create projects
    console.log('📁 Creating projects...');
    const createdProjects = [];
    
    // Project to team assignment
    const projectTeamAssignment = [
      { teamIndex: 0, memberIndices: [0, 1, 6] }, // Bharat E-Commerce - Frontend team
      { teamIndex: 2, memberIndices: [5, 6, 7] }, // Digital India App - Mobile team
      { teamIndex: 1, memberIndices: [2, 3, 4] }, // Smart City - Backend team
      { teamIndex: 1, memberIndices: [2, 4, 10] }, // FinTech - Backend team
      { teamIndex: 0, memberIndices: [0, 1, 8] }, // EdTech - Frontend team
      { teamIndex: 3, memberIndices: [9, 10] }, // Healthcare - QA team (completed) - FIXED: removed 11
      { teamIndex: 1, memberIndices: [2, 3, 10] }, // Agri-Tech - Backend team
      { teamIndex: 0, memberIndices: [0, 6, 8] }, // Travel Portal - Frontend team (completed)
      { teamIndex: 0, memberIndices: [1, 6] }, // Corporate Website - Frontend (on hold)
      { teamIndex: 1, memberIndices: [3, 4] } // AI Chatbot - Backend team
    ];
    
    for (let i = 0; i < projectsData.length; i++) {
      const projectData = projectsData[i];
      const assignment = projectTeamAssignment[i];
      const assignedTeam = teams[assignment.teamIndex];
      const managerForProject = i < 5 ? managers[0]._id : managers[1]._id;
      
      const project = await Project.create({
        ...projectData,
        manager: managerForProject,
        team: assignedTeam._id,
        members: assignment.memberIndices.map((empIndex, idx) => ({
          user: employees[empIndex]._id,
          role: idx === 0 ? 'Developer' : idx === 1 ? 'Designer' : 'Tester'
        })),
        activityLog: [{
          user: managerForProject,
          action: 'Created project',
          details: `Project "${projectData.name}" was created`,
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        }]
      });
      createdProjects.push(project);
      console.log(`   ✓ Created project: ${project.name} (${project.status})`);
    }
    
    // Create tasks with better distribution
    console.log('📋 Creating tasks...');
    const projectTaskMap = {
      0: [0, 1, 2, 3, 4, 5, 6],          // Bharat E-Commerce - 7 tasks
      1: [7, 8, 9, 10, 11],               // Digital India - 5 tasks
      2: [12, 13, 14, 15],                // Smart City - 4 tasks
      3: [16, 17, 18, 19, 20],            // FinTech - 5 tasks
      4: [21, 22, 23, 24, 25],            // EdTech - 5 tasks
      5: [26, 27, 28, 29],                // Healthcare - 4 tasks (completed)
      6: [30, 31, 32, 33],                // Agri-Tech - 4 tasks
      7: [34, 35, 36],                    // Travel Portal - 3 tasks (completed)
      8: [],                              // Corporate Website - 0 tasks (on hold)
      9: [37, 38, 39, 40]                 // AI Chatbot - 4 tasks
    };
    
    for (let projectIndex = 0; projectIndex < createdProjects.length; projectIndex++) {
      const project = createdProjects[projectIndex];
      const taskIndices = projectTaskMap[projectIndex];
      const projectMembers = project.members.map(m => m.user);
      
      for (let i = 0; i < taskIndices.length; i++) {
        const taskIndex = taskIndices[i];
        const taskData = tasksData[taskIndex];
        const assignedEmployee = projectMembers[i % projectMembers.length];
        
        const task = await Task.create({
          ...taskData,
          project: project._id,
          assignedTo: assignedEmployee,
          comments: taskData.status === 'Done' ? [{
            user: assignedEmployee,
            text: 'Task completed successfully! All requirements met.',
            createdAt: new Date(taskData.dueDate.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000)
          }] : taskData.status === 'In Progress' ? [{
            user: assignedEmployee,
            text: 'Working on this. Making good progress!',
            createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
          }] : []
        });
        
        console.log(`   ✓ Created task: ${task.title} (${task.status}) in ${project.name}`);
      }
    }
    
    // Add project comments and activity
    console.log('💬 Adding project comments and activity...');
    for (let i = 0; i < createdProjects.length; i++) {
      const project = createdProjects[i];
      const assignment = projectTeamAssignment[i];
      
      if (project.status === 'Ongoing') {
        // Manager comment
        project.comments.push({
          user: project.manager,
          text: 'Great progress on this project! Let\'s maintain the momentum.',
          createdAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000)
        });
        
        // Team member response
        project.comments.push({
          user: employees[assignment.memberIndices[0]]._id,
          text: 'Thank you! We are working hard to meet all deadlines.',
          createdAt: new Date(Date.now() - Math.random() * 4 * 24 * 60 * 60 * 1000)
        });
        
        // Another team member
        if (assignment.memberIndices.length > 1) {
          project.comments.push({
            user: employees[assignment.memberIndices[1]]._id,
            text: 'The team coordination has been excellent!',
            createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
          });
        }
        
        // Add activity logs
        project.activityLog.push({
          user: employees[assignment.memberIndices[0]]._id,
          action: 'Updated project status',
          details: 'Project milestone achieved',
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        });
        
        await project.save();
      } else if (project.status === 'Completed') {
        project.comments.push({
          user: project.manager,
          text: 'Excellent work team! Project delivered successfully.',
          createdAt: new Date(project.deadline.getTime() + 2 * 24 * 60 * 60 * 1000)
        });
        
        project.activityLog.push({
          user: project.manager,
          action: 'Marked project as completed',
          details: 'All deliverables completed successfully',
          timestamp: new Date(project.deadline)
        });
        
        await project.save();
      }
    }
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Seeding Summary:');
    console.log(`   👥 Users: ${createdUsers.length} (${managers.length} managers, ${employees.length} employees)`);
    console.log(`   👥 Teams: ${teams.length}`);
    console.log(`   📁 Projects: ${createdProjects.length}`);
    console.log(`   📋 Tasks: ${tasksData.length}`);
    
    console.log('\n🔐 Login Credentials:');
    console.log('\n   📌 MANAGERS:');
    console.log('   • rajesh.kumar@gmail.com / Rajesh123!@');
    console.log('   • priya.sharma@outlook.com / Priya123!@');
    console.log('\n   📌 EMPLOYEES:');
    console.log('   • amit.patel@gmail.com / Amit123!@');
    console.log('   • sneha.reddy@yahoo.com / Sneha123!@');
    console.log('   • vikram.singh@gmail.com / Vikram123!@');
    console.log('   • ananya.gupta@outlook.com / Ananya123!@');
    console.log('   • rohan.verma@gmail.com / Rohan123!@');
    console.log('   • kavya.nair@yahoo.com / Kavya123!@');
    console.log('   • arjun.desai@gmail.com / Arjun123!@');
    console.log('   • ishita.joshi@outlook.com / Ishita123!@');
    console.log('   • karan.mehta@gmail.com / Karan123!@');
    console.log('   • neha.iyer@yahoo.com / Neha123!@');
    console.log('   • siddharth.rao@gmail.com / Siddharth123!@');
    
    console.log('\n🎯 Project Distribution:');
    console.log('   • Ongoing: 7 projects');
    console.log('   • Completed: 2 projects');
    console.log('   • On Hold: 1 project');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
};

// Run the seeding
seedDatabase();