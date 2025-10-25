import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// @desc    Get tasks for the logged-in user
// @route   GET /api/tasks
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { project, status, priority } = req.query;
    
    let query = {};
    
    // Role-based access
    if (req.user.role === 'manager') {
      // Manager sees all tasks in their projects
      const projects = await Project.find({ manager: req.user.id });
      const projectIds = projects.map(p => p._id);
      query.project = { $in: projectIds };
    } else {
      // Employee sees only their assigned tasks
      query.assignedTo = req.user.id;
    }
    
    // Apply filters
    if (project) {
      query.project = project;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }

    const tasks = await Task.find(query)
      .populate('project', 'name status')
      .populate('assignedTo', 'name email')
      .populate('comments.user', 'name')
      .sort({ createdAt: -1 });
      
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
router.post('/', protect, async (req, res) => {
  const { title, description, project, assignedTo, dueDate, priority, estimatedHours, tags } = req.body;
  
  try {
    // Validate required fields
    if (!title || !project) {
      return res.status(400).json({ error: 'Title and project are required' });
    }
    
    // Check if project exists and user has access
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(400).json({ error: 'Project not found' });
    }
    
    // Check if user is manager or project member
    const hasAccess = req.user.role === 'manager' || 
                      projectDoc.manager.toString() === req.user.id ||
                      projectDoc.members.some(member => member.user.toString() === req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to create tasks in this project' });
    }
    
    const task = new Task({
      title,
      description,
      project,
      assignedTo: assignedTo || req.user.id,
      priority: priority || 'Medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours,
      tags: tags || []
    });
    
    const createdTask = await task.save();
    
    // Add activity to project
    projectDoc.addActivity(req.user.id, 'Created task', `Created task "${title}"`);
    await projectDoc.save();
    
    // Create notification for assigned user (if not assigning to self)
    if (assignedTo && assignedTo.toString() !== req.user.id.toString()) {
      await Notification.create({
        user: assignedTo,
        type: 'taskStatus',
        title: 'New Task Assigned',
        message: `You have been assigned to "${title}" in project "${projectDoc.name}"`,
        link: `/tasks`,
        metadata: {
          taskId: createdTask._id,
          projectId: project,
          priority: priority || 'Medium'
        }
      });
    }
    
    // Populate and return the created task
    const populatedTask = await Task.findById(createdTask._id)
      .populate('project', 'name status')
      .populate('assignedTo', 'name email');
    
    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Create task error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Server error while creating task' });
  }
});

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user has access to update this task
    const hasAccess = req.user.role === 'manager' || 
                      task.project.manager.toString() === req.user.id ||
                      task.assignedTo?.toString() === req.user.id ||
                      task.project.members.some(member => member.user.toString() === req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }
    
    const { title, description, status, priority, dueDate, assignedTo, estimatedHours, actualHours, tags } = req.body;
    
    // Track changes for activity log
    const changes = [];
    if (title && title !== task.title) changes.push(`title from "${task.title}" to "${title}"`);
    if (status && status !== task.status) changes.push(`status from "${task.status}" to "${status}"`);
    if (priority && priority !== task.priority) changes.push(`priority from "${task.priority}" to "${priority}"`);
    
    // Track if assignee is changing
    const oldAssignee = task.assignedTo?.toString();
    const newAssignee = assignedTo?.toString();
    const assigneeChanged = newAssignee && oldAssignee !== newAssignee;
    
    // Update fields
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = new Date(dueDate);
    if (assignedTo) task.assignedTo = assignedTo;
    
    // Create notification for new assignee
    if (assigneeChanged && newAssignee !== req.user.id.toString()) {
      await Notification.create({
        user: newAssignee,
        type: 'taskStatus',
        title: 'Task Reassigned to You',
        message: `You have been assigned to "${task.title}" in project "${task.project.name}"`,
        link: `/tasks`,
        metadata: {
          taskId: task._id,
          projectId: task.project._id,
          priority: task.priority
        }
      });
    }
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
    if (actualHours !== undefined) task.actualHours = actualHours;
    if (tags) task.tags = tags;
    
    const updatedTask = await task.save();
    
    // Add activity to project if there were changes
    if (changes.length > 0) {
      const project = await Project.findById(task.project._id);
      project.addActivity(req.user.id, 'Updated task', `Updated task "${task.title}": ${changes.join(', ')}`);
      await project.save();
    }
    
    // Populate and return
    const populatedTask = await Task.findById(updatedTask._id)
      .populate('project', 'name status')
      .populate('assignedTo', 'name email')
      .populate('comments.user', 'name');
    
    res.json(populatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user has access to delete this task
    const hasAccess = req.user.role === 'manager' || 
                      task.project.manager.toString() === req.user.id;
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to delete this task' });
    }
    
    // Add activity to project
    const project = await Project.findById(task.project._id);
    project.addActivity(req.user.id, 'Deleted task', `Deleted task "${task.title}"`);
    await project.save();
    
    await Task.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    
    const task = await Task.findById(req.params.id).populate('project');
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user has access to comment on this task
    const hasAccess = req.user.role === 'manager' || 
                      task.project.manager.toString() === req.user.id ||
                      task.assignedTo?.toString() === req.user.id ||
                      task.project.members.some(member => member.user.toString() === req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to comment on this task' });
    }
    
    const comment = {
      user: req.user.id,
      text: text.trim(),
      createdAt: new Date()
    };
    
    task.comments.unshift(comment);
    await task.save();
    
    // Add activity to project
    const project = await Project.findById(task.project._id);
    project.addActivity(req.user.id, 'Commented on task', `Added comment to task "${task.title}"`);
    await project.save();
    
    // Return the task with populated comments
    const updatedTask = await Task.findById(task._id)
      .populate('comments.user', 'name email');
    
    res.json(updatedTask.comments[0]);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;