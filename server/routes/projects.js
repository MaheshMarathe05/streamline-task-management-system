import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect, manager } from '../middleware/authMiddleware.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Multer setup for local file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Helper function to get project progress
const getProjectProgress = async (projectId) => {
  const totalTasks = await Task.countDocuments({ project: projectId });
  if (totalTasks === 0) return { progress: 0, totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0 };
  
  const completedTasks = await Task.countDocuments({ project: projectId, status: 'Done' });
  const pendingTasks = await Task.countDocuments({ project: projectId, status: { $ne: 'Done' } });
  const overdueTasks = await Task.countDocuments({ 
    project: projectId, 
    dueDate: { $lt: new Date() }, 
    status: { $ne: 'Done' } 
  });
  
  const progress = Math.round((completedTasks / totalTasks) * 100);
  
  return { progress, totalTasks, completedTasks, pendingTasks, overdueTasks };
};

// @desc    Get projects for the logged-in user with enhanced data
// @route   GET /api/projects
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, status, priority } = req.query;
    
    let query = {};
    
    // Role-based access
    if (req.user.role === 'manager') {
      query = { 
        $or: [
          { manager: req.user.id }, 
          { 'members.user': req.user.id }
        ] 
      };
    } else {
      query = { 'members.user': req.user.id };
    }
    
    // Apply filters
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      });
    }
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }

    const projects = await Project.find(query)
      .populate('manager', 'name email')
      .populate('members.user', 'name email')
      .populate('team', 'name')
      .populate('comments.user', 'name')
      .populate('activityLog.user', 'name')
      .sort({ updatedAt: -1 });

    // Add progress data for each project
    const enhancedProjects = await Promise.all(
      projects.map(async (project) => {
        const progressData = await getProjectProgress(project._id);
        const projectObj = project.toObject();
        projectObj.progressData = progressData;
        // Also add progress directly for easy frontend access
        projectObj.progress = progressData.progress;
        projectObj.totalTasks = progressData.totalTasks;
        projectObj.completedTasks = progressData.completedTasks;
        
        // Add tasks data
        const tasks = await Task.find({ project: project._id })
          .populate('assignedTo', 'name email')
          .sort({ createdAt: -1 });
        projectObj.tasks = tasks;
        
        return projectObj;
      })
    );

    res.json(enhancedProjects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager', 'name email')
      .populate('members.user', 'name email role')
      .populate('team', 'name')
      .populate('comments.user', 'name')
      .populate('activityLog.user', 'name');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has access to this project
    const hasAccess = project.members.some(member => member.user._id.toString() === req.user.id) || 
                      project.manager._id.toString() === req.user.id ||
                      req.user.role === 'manager';

    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to view this project' });
    }

    // Add progress data
    const progressData = await getProjectProgress(project._id);
    const projectObj = project.toObject();
    projectObj.progressData = progressData;
    // Also add progress directly for easy frontend access
    projectObj.progress = progressData.progress;
    projectObj.totalTasks = progressData.totalTasks;
    projectObj.completedTasks = progressData.completedTasks;
    
    // Add tasks data
    const tasks = await Task.find({ project: project._id })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
    projectObj.tasks = tasks;

    res.json(projectObj);
  } catch (error) {
    console.error('Get single project error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private/Manager
router.post('/', protect, manager, async (req, res) => {
  const { name, description, team: teamId, deadline, priority, memberIds, tags } = req.body;
  
  try {
    let members = [];
    
    // If specific member IDs are provided, use them
    if (memberIds && Array.isArray(memberIds)) {
      members = memberIds.map(userId => ({ user: userId, role: 'Developer' }));
    } else if (teamId) {
      // Otherwise use team members
      const team = await Team.findById(teamId).populate('members', 'name email');
      if (!team) return res.status(400).json({ error: 'Invalid team selected.' });
      members = team.members.map(user => ({ user: user._id, role: 'Developer' }));
    }
    
    const project = new Project({
      name,
      description,
      manager: req.user.id,
      team: teamId,
      members,
      deadline: deadline ? new Date(deadline) : null,
      priority: priority || 'Medium',
      tags: tags || []
    });
    
    // Add initial activity
    project.addActivity(req.user.id, 'Created project', `Project "${name}" was created`);
    
    const createdProject = await project.save();
    
    // Create notifications for all project members
    if (members && members.length > 0) {
      const notifications = members.map(member => ({
        user: member.user,
        type: 'project',
        title: 'Added to New Project',
        message: `You have been added to project "${name}"`,
        link: `/projects/${createdProject._id}`,
        metadata: {
          projectId: createdProject._id,
          priority: priority || 'Medium'
        }
      }));
      await Notification.insertMany(notifications);
    }
    
    // Populate the created project
    const populatedProject = await Project.findById(createdProject._id)
      .populate('manager', 'name email')
      .populate('members.user', 'name email')
      .populate('team', 'name');
    
    res.status(201).json(populatedProject);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private/Manager
router.put('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user is manager or project manager
    if (req.user.role !== 'manager' && project.manager.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this project' });
    }
    
    const { name, description, status, priority, deadline, memberIds, tags } = req.body;
    
    // Track changes for activity log
    const changes = [];
    if (name && name !== project.name) changes.push(`name from "${project.name}" to "${name}"`);
    if (status && status !== project.status) changes.push(`status from "${project.status}" to "${status}"`);
    if (priority && priority !== project.priority) changes.push(`priority from "${project.priority}" to "${priority}"`);
    
    // Update fields
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;
    if (priority) project.priority = priority;
    if (deadline) project.deadline = new Date(deadline);
    if (tags) project.tags = tags;
    
    // Update members if provided
    if (memberIds && Array.isArray(memberIds)) {
      const oldMemberIds = project.members.map(m => m.user.toString());
      const newMemberIds = memberIds.filter(id => !oldMemberIds.includes(id.toString()));
      
      project.members = memberIds.map(userId => ({ user: userId, role: 'Developer' }));
      changes.push('team members');
      
      // Create notifications for newly added members
      if (newMemberIds.length > 0) {
        const notifications = newMemberIds.map(userId => ({
          user: userId,
          type: 'project',
          title: 'Added to Project',
          message: `You have been added to project "${project.name}"`,
          link: `/projects/${project._id}`,
          metadata: {
            projectId: project._id,
            priority: project.priority
          }
        }));
        await Notification.insertMany(notifications);
      }
    }
    
    // Add activity log
    if (changes.length > 0) {
      project.addActivity(req.user.id, 'Updated project', `Updated ${changes.join(', ')}`);
    }
    
    const updatedProject = await project.save();
    
    // Populate and return
    const populatedProject = await Project.findById(updatedProject._id)
      .populate('manager', 'name email')
      .populate('members.user', 'name email')
      .populate('team', 'name')
      .populate('comments.user', 'name')
      .populate('activityLog.user', 'name');
    
    res.json(populatedProject);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private/Manager
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user is manager or project manager
    if (req.user.role !== 'manager' && project.manager.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this project' });
    }
    
    // Delete all tasks associated with this project
    await Task.deleteMany({ project: req.params.id });
    
    // Delete the project
    await Project.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Project and associated tasks deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Add comment to project
// @route   POST /api/projects/:id/comments
// @access  Private
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user is member of the project
    const isMember = project.members.some(member => member.user.toString() === req.user.id) || 
                     project.manager.toString() === req.user.id;
    
    if (!isMember) {
      return res.status(403).json({ error: 'Not authorized to comment on this project' });
    }
    
    const comment = {
      user: req.user.id,
      text: text.trim(),
      createdAt: new Date()
    };
    
    project.comments.unshift(comment);
    project.addActivity(req.user.id, 'Added comment', 'Added a new comment to the project');
    
    await project.save();
    
    // Return the project with populated comments
    const updatedProject = await Project.findById(project._id)
      .populate('comments.user', 'name email');
    
    res.json(updatedProject.comments[0]);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Get project tasks
// @route   GET /api/projects/:id/tasks
// @access  Private
router.get('/:id/tasks', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user has access to this project
    const hasAccess = project.members.some(member => member.user.toString() === req.user.id) || 
                      project.manager.toString() === req.user.id;
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to view this project' });
    }
    
    const tasks = await Task.find({ project: req.params.id })
      .populate('assignedTo', 'name email')
      .populate('comments.user', 'name')
      .sort({ createdAt: -1 });
    
    res.json(tasks);
  } catch (error) {
    console.error('Get project tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Upload project file
// @route   POST /api/projects/:id/files
// @access  Private
router.post('/:id/files', protect, upload.single('file'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user has access to this project
    const hasAccess = project.members.some(member => member.user.toString() === req.user.id) || 
                      project.manager.toString() === req.user.id;
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to upload files to this project' });
    }
    
    const attachment = {
      name: req.file.originalname,
      url: req.file.filename,
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    };
    
    project.attachments.push(attachment);
    project.addActivity(req.user.id, 'Uploaded file', `Uploaded file "${req.file.originalname}"`);
    
    await project.save();
    
    res.status(201).json(attachment);
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload error' });
  }
});

// @desc    Get project analytics
// @route   GET /api/projects/:id/analytics
// @access  Private
router.get('/:id/analytics', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user has access to this project
    const hasAccess = project.members.some(member => member.user.toString() === req.user.id) || 
                      project.manager.toString() === req.user.id;
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to view this project' });
    }
    
    const progressData = await getProjectProgress(req.params.id);
    
    // Get all tasks for this project
    const tasks = await Task.find({ project: project._id }).populate('assignedTo', 'name');
    
    // Calculate task statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'Done').length;
    const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;
    const todoTasks = tasks.filter(task => task.status === 'To Do').length;
    
    // Calculate time tracking
    const estimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    const actualHours = tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
    const efficiency = estimatedHours > 0 ? Math.round((estimatedHours / actualHours) * 100) : 0;
    
    // Calculate team performance
    const teamPerformance = [];
    const assigneeStats = {};
    
    tasks.forEach(task => {
      const assigneeId = task.assignedTo?._id?.toString();
      const assigneeName = task.assignedTo?.name || 'Unassigned';
      
      if (!assigneeStats[assigneeId]) {
        assigneeStats[assigneeId] = {
          userId: assigneeId,
          name: assigneeName,
          totalTasks: 0,
          completedTasks: 0
        };
      }
      
      assigneeStats[assigneeId].totalTasks++;
      if (task.status === 'Done') {
        assigneeStats[assigneeId].completedTasks++;
      }
    });
    
    Object.values(assigneeStats).forEach(stats => {
      if (stats.userId) {
        teamPerformance.push({
          userId: stats.userId,
          name: stats.name,
          completionRate: stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0
        });
      }
    });
    
    // Project health indicators
    const onSchedule = true; // You can implement deadline checking logic here
    const riskLevel = completedTasks / totalTasks > 0.7 ? 'Low' : completedTasks / totalTasks > 0.4 ? 'Medium' : 'High';

    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      estimatedHours,
      actualHours,
      efficiency,
      teamPerformance,
      onSchedule,
      riskLevel,
      progress: progressData,
      tasksByStatus: [
        { _id: 'Done', count: completedTasks },
        { _id: 'In Progress', count: inProgressTasks },
        { _id: 'To Do', count: todoTasks }
      ],
      tasksByPriority: await Task.aggregate([
        { $match: { project: project._id } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      tasksByAssignee: teamPerformance
    });
  } catch (error) {
    console.error('Get project analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
