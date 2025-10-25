import express from 'express';
import { protect, manager } from '../middleware/authMiddleware.js';
import StatusChangeRequest from '../models/StatusChangeRequest.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// @desc    Create a status change request
// @route   POST /api/status-requests
// @access  Private (Employees)
router.post('/', protect, async (req, res) => {
  try {
    const { taskId, requestedStatus, reason } = req.body;

    // Validate required fields
    if (!taskId || !requestedStatus || !reason) {
      return res.status(400).json({ 
        error: 'Task ID, requested status, and reason are required' 
      });
    }

    // Get the task
    const task = await Task.findById(taskId).populate('project');
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user is assigned to this task
    if (task.assignedTo.toString() !== req.user.id && req.user.role !== 'manager') {
      return res.status(403).json({ 
        error: 'You can only request status changes for tasks assigned to you' 
      });
    }

    // Check if there's already a pending request for this task
    const existingRequest = await StatusChangeRequest.findOne({
      task: taskId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ 
        error: 'There is already a pending status change request for this task' 
      });
    }

    // Create the request
    const statusRequest = new StatusChangeRequest({
      task: taskId,
      requestedBy: req.user.id,
      currentStatus: task.status,
      requestedStatus,
      reason
    });

    await statusRequest.save();

    // Create notification for project manager
    const project = await Project.findById(task.project._id);
    await Notification.create({
      user: project.manager,
      type: 'statusChange',
      title: 'Status Change Request',
      message: `${req.user.name} requests to change "${task.title}" from "${task.status}" to "${requestedStatus}"`,
      link: `/tasks`,
      metadata: {
        taskId: task._id,
        requestId: statusRequest._id,
        requestedStatus
      }
    });

    // Populate and return
    const populatedRequest = await StatusChangeRequest.findById(statusRequest._id)
      .populate('task', 'title status')
      .populate('requestedBy', 'name email');

    res.status(201).json(populatedRequest);
  } catch (error) {
    console.error('Create status change request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Get status change requests
// @route   GET /api/status-requests
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, taskId } = req.query;

    let query = {};

    // Managers see all pending requests for their projects
    if (req.user.role === 'manager') {
      const projects = await Project.find({ manager: req.user.id });
      const projectIds = projects.map(p => p._id);
      const tasks = await Task.find({ project: { $in: projectIds } });
      const taskIds = tasks.map(t => t._id);
      query.task = { $in: taskIds };
    } else {
      // Employees see only their own requests
      query.requestedBy = req.user.id;
    }

    // Apply filters
    if (status) {
      query.status = status;
    }

    if (taskId) {
      query.task = taskId;
    }

    const requests = await StatusChangeRequest.find(query)
      .populate('task', 'title status project')
      .populate('requestedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Get status change requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Approve or reject a status change request
// @route   PUT /api/status-requests/:id
// @access  Private (Manager only)
router.put('/:id', protect, manager, async (req, res) => {
  try {
    const { action, comment } = req.body; // action: 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        error: 'Action must be either "approve" or "reject"' 
      });
    }

    const statusRequest = await StatusChangeRequest.findById(req.params.id)
      .populate('task')
      .populate('requestedBy', 'name email');

    if (!statusRequest) {
      return res.status(404).json({ error: 'Status change request not found' });
    }

    if (statusRequest.status !== 'pending') {
      return res.status(400).json({ 
        error: 'This request has already been reviewed' 
      });
    }

    // Check if manager has access to this task's project
    const task = await Task.findById(statusRequest.task._id).populate('project');
    if (task.project.manager.toString() !== req.user.id) {
      return res.status(403).json({ 
        error: 'You can only review requests for tasks in your projects' 
      });
    }

    // Update the request
    statusRequest.status = action === 'approve' ? 'approved' : 'rejected';
    statusRequest.reviewedBy = req.user.id;
    statusRequest.reviewComment = comment;
    statusRequest.reviewedAt = new Date();

    await statusRequest.save();

    // If approved, update the task status
    if (action === 'approve') {
      task.status = statusRequest.requestedStatus;
      await task.save();

      // Add activity to project
      const project = await Project.findById(task.project._id);
      project.addActivity(
        req.user.id,
        'Approved status change',
        `Approved status change for "${task.title}" to "${statusRequest.requestedStatus}"`
      );
      await project.save();
    }

    // Create notification for the employee
    await Notification.create({
      user: statusRequest.requestedBy._id,
      type: 'statusChange',
      title: action === 'approve' ? 'Status Change Approved' : 'Status Change Rejected',
      message: action === 'approve' 
        ? `Your request to change "${task.title}" to "${statusRequest.requestedStatus}" has been approved`
        : `Your request to change "${task.title}" to "${statusRequest.requestedStatus}" has been rejected`,
      link: `/tasks`,
      metadata: {
        taskId: task._id,
        requestId: statusRequest._id,
        action
      }
    });

    // Populate and return
    const populatedRequest = await StatusChangeRequest.findById(statusRequest._id)
      .populate('task', 'title status')
      .populate('requestedBy', 'name email')
      .populate('reviewedBy', 'name email');

    res.json(populatedRequest);
  } catch (error) {
    console.error('Review status change request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @desc    Delete a status change request (cancel by requester)
// @route   DELETE /api/status-requests/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const statusRequest = await StatusChangeRequest.findById(req.params.id);

    if (!statusRequest) {
      return res.status(404).json({ error: 'Status change request not found' });
    }

    // Only the requester can delete their own pending requests
    if (statusRequest.requestedBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        error: 'You can only cancel your own requests' 
      });
    }

    if (statusRequest.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Cannot cancel a request that has already been reviewed' 
      });
    }

    await StatusChangeRequest.findByIdAndDelete(req.params.id);

    res.json({ message: 'Status change request cancelled successfully' });
  } catch (error) {
    console.error('Delete status change request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
