import express from 'express';
import { protect, manager } from '../middleware/authMiddleware.js';
import TaskReport from '../models/TaskReport.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// @desc    Submit task report
// @route   POST /api/task-reports
// @access  Private (employees and managers)
router.post('/', protect, async (req, res) => {
    try {
        const {
            taskId,
            workAccomplished,
            challengesFaced,
            timeSpent,
            completionPercentage,
            nextSteps,
            blockers
        } = req.body;

        // Validation
        if (!taskId || !workAccomplished || workAccomplished.trim().length === 0) {
            return res.status(400).json({ error: 'Task ID and work accomplished are required' });
        }

        // Find task and populate project
        const task = await Task.findById(taskId).populate('project');
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Check if user is assigned to this task
        if (task.assignedTo?.toString() !== req.user.id && req.user.role !== 'manager') {
            return res.status(403).json({ error: 'Not authorized to submit report for this task' });
        }

        // Create the report
        const report = new TaskReport({
            task: taskId,
            submittedBy: req.user.id,
            workAccomplished,
            challengesFaced,
            timeSpent: timeSpent || 0,
            completionPercentage: completionPercentage || 0,
            nextSteps,
            blockers,
            status: 'pending'
        });

        await report.save();

        // Update task's actual hours if time spent is provided
        if (timeSpent && timeSpent > 0) {
            task.actualHours = (task.actualHours || 0) + parseFloat(timeSpent);
            await task.save();
        }

        // Add activity to project
        const project = await Project.findById(task.project._id);
        if (project) {
            project.addActivity(
                req.user.id,
                'Submitted report',
                `Submitted progress report for task "${task.title}" (${completionPercentage || 0}% complete)`
            );
            await project.save();
        }

        // Create notification for project manager
        if (task.project.manager.toString() !== req.user.id) {
            await Notification.create({
                user: task.project.manager,
                title: 'New Task Report Submitted',
                message: `${req.user.name} submitted a progress report for "${task.title}"`,
                type: 'report',
                relatedProject: task.project._id,
                relatedTask: taskId
            });
        }

        // Populate the report before returning
        const populatedReport = await TaskReport.findById(report._id)
            .populate('task', 'title status priority')
            .populate('submittedBy', 'name email')
            .populate({
                path: 'task',
                populate: { path: 'project', select: 'name' }
            });

        res.status(201).json({
            message: 'Report submitted successfully',
            report: populatedReport
        });
    } catch (error) {
        console.error('Submit report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @desc    Get task reports (role-based filtering)
// @route   GET /api/task-reports
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const { status, taskId } = req.query;
        let query = {};

        // Role-based filtering
        if (req.user.role === 'manager') {
            // Managers see reports for tasks in their projects
            const managerProjects = await Project.find({ manager: req.user.id }).select('_id');
            const projectIds = managerProjects.map(p => p._id);
            const tasks = await Task.find({ project: { $in: projectIds } }).select('_id');
            const taskIds = tasks.map(t => t._id);
            query.task = { $in: taskIds };
        } else {
            // Employees see only their own reports
            query.submittedBy = req.user.id;
        }

        // Filter by status if provided
        if (status) {
            query.status = status;
        }

        // Filter by specific task if provided
        if (taskId) {
            query.task = taskId;
        }

        const reports = await TaskReport.find(query)
            .populate('task', 'title status priority')
            .populate('submittedBy', 'name email')
            .populate('reviewedBy', 'name email')
            .populate({
                path: 'task',
                populate: { path: 'project', select: 'name' }
            })
            .sort({ createdAt: -1 });

        res.json({ reports });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @desc    Review a task report (manager only)
// @route   PUT /api/task-reports/:id/review
// @access  Private (manager only)
router.put('/:id/review', protect, manager, async (req, res) => {
    try {
        const { comment } = req.body;
        
        const report = await TaskReport.findById(req.params.id)
            .populate('task')
            .populate('submittedBy', 'name email');

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({ error: 'Report has already been reviewed' });
        }

        // Verify manager has access to this report's project
        const task = await Task.findById(report.task._id).populate('project');
        if (task.project.manager.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to review this report' });
        }

        // Update report
        report.status = 'reviewed';
        report.reviewedBy = req.user.id;
        report.reviewComment = comment || '';
        report.reviewedAt = new Date();
        await report.save();

        // Add activity to project
        const project = await Project.findById(task.project._id);
        if (project) {
            project.addActivity(
                req.user.id,
                'Reviewed report',
                `Reviewed progress report for task "${task.title}"`
            );
            await project.save();
        }

        // Notify employee
        await Notification.create({
            user: report.submittedBy._id,
            title: 'Report Reviewed',
            message: `Your progress report for "${task.title}" has been reviewed by ${req.user.name}`,
            type: 'report',
            relatedProject: task.project._id,
            relatedTask: task._id
        });

        // Populate and return
        const updatedReport = await TaskReport.findById(report._id)
            .populate('task', 'title status priority')
            .populate('submittedBy', 'name email')
            .populate('reviewedBy', 'name email')
            .populate({
                path: 'task',
                populate: { path: 'project', select: 'name' }
            });

        res.json({
            message: 'Report reviewed successfully',
            report: updatedReport
        });
    } catch (error) {
        console.error('Review report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @desc    Acknowledge a task report (mark as acknowledged)
// @route   PUT /api/task-reports/:id/acknowledge
// @access  Private (manager only)
router.put('/:id/acknowledge', protect, manager, async (req, res) => {
    try {
        const report = await TaskReport.findById(req.params.id).populate('task');

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Verify manager has access
        const task = await Task.findById(report.task._id).populate('project');
        if (task.project.manager.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        report.status = 'acknowledged';
        if (!report.reviewedBy) {
            report.reviewedBy = req.user.id;
            report.reviewedAt = new Date();
        }
        await report.save();

        const updatedReport = await TaskReport.findById(report._id)
            .populate('task', 'title status priority')
            .populate('submittedBy', 'name email')
            .populate('reviewedBy', 'name email')
            .populate({
                path: 'task',
                populate: { path: 'project', select: 'name' }
            });

        res.json({
            message: 'Report acknowledged',
            report: updatedReport
        });
    } catch (error) {
        console.error('Acknowledge report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @desc    Delete a task report (employee can delete their own pending reports)
// @route   DELETE /api/task-reports/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const report = await TaskReport.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        // Only the submitter can delete, and only if it's pending
        if (report.submittedBy.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this report' });
        }

        if (report.status !== 'pending') {
            return res.status(400).json({ error: 'Cannot delete reviewed reports' });
        }

        await TaskReport.findByIdAndDelete(req.params.id);

        res.json({ message: 'Report deleted successfully' });
    } catch (error) {
        console.error('Delete report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
