import express from 'express';
import { protect, manager } from '../middleware/authMiddleware.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import mongoose from 'mongoose';

const router = express.Router();

// @desc    Get aggregated stats for the dashboard sidebar and project-level analytics
// @route   GET /api/reports/dashboard-stats
// @access  Private
router.get('/dashboard-stats', protect, async (req, res) => {
    try {
        const userId = req.user._id;
        const { projectId } = req.query;

        let matchStage = {};
        if (projectId) {
            matchStage.project = new mongoose.Types.ObjectId(projectId);
        }
        
        // Filter by current user unless they are a manager (case-insensitive)
        const isManager = req.user.role?.toLowerCase() === 'manager';
        if (!isManager) {
            matchStage.assignedTo = userId;
        }

        // 1. Get Completed Task counts for team members (optionally filtered by project and user)
        const completedTasks = await Task.aggregate([
            { $match: { status: 'Done', ...matchStage } },
            { $group: { _id: '$assignedTo', tasks: { $sum: 1 } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { name: '$user.name', tasks: 1, fill: '#8A63D2' } },
            { $limit: 4 }
        ]);

        // 2. Calculate Efficiency (Completed Tasks / Total Tasks) for team members
        const allTasks = await Task.aggregate([
            { $match: matchStage },
            { $group: { _id: '$assignedTo', total: { $sum: 1 } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { name: '$user.name', total: 1 } }
        ]);

        const efficiencyData = allTasks.map(userTasks => {
            const userCompleted = completedTasks.find(c => c.name === userTasks.name);
            const completedCount = userCompleted ? userCompleted.tasks : 0;
            const efficiency = userTasks.total > 0 ? Math.round((completedCount / userTasks.total) * 100) : 0;
            return {
                name: userTasks.name,
                value: efficiency,
                fill: '#8A63D2'
            };
        });

        // 3. Burn-down chart data (tasks vs time)
        const burnDownData = await Task.aggregate([
            { $match: matchStage },
            { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, status: "$status" }, count: { $sum: 1 } } },
            { $sort: { "_id.date": 1 } }
        ]);
        
        // 4. Get task counts by status for the current user
        const todoCount = await Task.countDocuments({ ...matchStage, status: 'To Do' });
        const inProgressCount = await Task.countDocuments({ ...matchStage, status: 'In Progress' });
        const doneCount = await Task.countDocuments({ ...matchStage, status: 'Done' });

        const responseData = {
            completedTasksData: completedTasks,
            efficiencyData,
            burnDownData,
            todoCount,
            inProgressCount,
            doneCount
        };
        
        console.log('📊 Dashboard Stats API Response for', req.user.email, '(Role:', req.user.role + '):');
        console.log('   Is Manager:', isManager);
        console.log('   Match Stage:', JSON.stringify(matchStage));
        console.log('   To Do:', todoCount, '| In Progress:', inProgressCount, '| Done:', doneCount);
        
        res.json(responseData);

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @desc    Get comprehensive project statistics for dashboard
// @route   GET /api/reports/project-stats
// @access  Private
router.get('/project-stats', protect, async (req, res) => {
    try {
        const userId = req.user._id;
        const isManager = req.user.role?.toLowerCase() === 'manager';

        // Build match condition based on role
        let projectMatch = {};
        if (!isManager) {
            projectMatch = {
                $or: [
                    { manager: userId },
                    { 'members.user': userId }
                ]
            };
        }

        // 1. Get active projects count (including 'Ongoing' status)
        const activeProjectsCount = await Project.countDocuments({
            ...projectMatch,
            status: { $in: ['Planning', 'In Progress', 'Ongoing'] }
        });

        // 2. Get total projects
        const totalProjects = await Project.countDocuments(projectMatch);

        // 3. Get completed projects count
        const completedProjectsCount = await Project.countDocuments({
            ...projectMatch,
            status: 'Completed'
        });

        // 4. Calculate project completion rate
        // Formula: (Completed Projects / Total Projects) × 100
        const completionRate = totalProjects > 0 
            ? Math.round((completedProjectsCount / totalProjects) * 100) 
            : 0;
        
        console.log('📊 Completion Rate Calculation:');
        console.log('   Total Projects:', totalProjects);
        console.log('   Completed Projects:', completedProjectsCount);
        console.log('   Formula: (' + completedProjectsCount + ' / ' + totalProjects + ') × 100');
        console.log('   Result:', completionRate + '%');

        // 5. Get recent projects (last 5) with calculated progress
        const recentProjectsRaw = await Project.find(projectMatch)
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate('manager', 'name')
            .select('name status priority startDate endDate');
        
        // Calculate progress for each recent project
        const recentProjects = await Promise.all(
            recentProjectsRaw.map(async (project) => {
                const projectObj = project.toObject();
                
                // Calculate progress
                const totalTasks = await Task.countDocuments({ project: project._id });
                if (totalTasks === 0) {
                    projectObj.progress = 0;
                    projectObj.totalTasks = 0;
                    projectObj.completedTasks = 0;
                } else {
                    const completedTasks = await Task.countDocuments({ project: project._id, status: 'Done' });
                    projectObj.progress = Math.round((completedTasks / totalTasks) * 100);
                    projectObj.totalTasks = totalTasks;
                    projectObj.completedTasks = completedTasks;
                }
                
                return projectObj;
            })
        );
        
        console.log('📊 Recent Projects with Progress:');
        recentProjects.forEach(p => {
            console.log(`   "${p.name}": ${p.progress}% (${p.completedTasks}/${p.totalTasks} tasks)`);
        });

        // 6. Get project-wise task distribution
        console.log('🔍 Building Project Task Stats for:', req.user.email, '| Is Manager:', isManager);
        console.log('   User ID:', userId);
        
        const projectTaskStats = await Task.aggregate([
            {
                $lookup: {
                    from: 'projects',
                    localField: 'project',
                    foreignField: '_id',
                    as: 'projectInfo'
                }
            },
            { 
                $unwind: { 
                    path: '$projectInfo',
                    preserveNullAndEmptyArrays: false  // Only include tasks WITH projects
                } 
            },
            ...(isManager ? [] : [{
                $match: {
                    $or: [
                        { 'projectInfo.manager': userId },
                        { 'projectInfo.members.user': userId },
                        { assignedTo: userId }  // Also include tasks directly assigned to user
                    ]
                }
            }]),
            {
                $group: {
                    _id: '$project',
                    projectName: { $first: '$projectInfo.name' },
                    totalTasks: { $sum: 1 },
                    completedTasks: {
                        $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] }
                    },
                    inProgressTasks: {
                        $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
                    },
                    todoTasks: {
                        $sum: { $cond: [{ $eq: ['$status', 'To Do'] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    projectName: 1,
                    totalTasks: 1,
                    completedTasks: 1,
                    inProgressTasks: 1,
                    todoTasks: 1,
                    completionRate: {
                        $cond: [
                            { $gt: ['$totalTasks', 0] },
                            { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] },
                            0
                        ]
                    }
                }
            },
            { $sort: { totalTasks: -1 } },
            { $limit: 10 }
        ]);
        
        console.log('📊 Project Task Stats Result:');
        console.log('   Found', projectTaskStats.length, 'projects with tasks');
        if (projectTaskStats.length > 0) {
            console.log('   Projects:', projectTaskStats.map(p => p.projectName).join(', '));
            console.log('   Full data:', JSON.stringify(projectTaskStats, null, 2));
        } else {
            console.log('   ⚠️ No project task stats found!');
            console.log('   This could mean:');
            console.log('   1. User has no tasks assigned to projects');
            console.log('   2. Tasks are not linked to projects (project field is null)');
            console.log('   3. User is not a team member of any projects');
        }

        // 7. Get task trends for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const taskTrends = await Task.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            ...(isManager ? [] : [{ $match: { assignedTo: userId } }]),
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        status: "$status"
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.date": 1 } }
        ]);

        // 8. Get overdue tasks count
        const now = new Date();
        const overdueTasks = await Task.countDocuments({
            ...(isManager ? {} : { assignedTo: userId }),
            dueDate: { $lt: now },
            status: { $ne: 'Done' }
        });

        // 9. Get upcoming deadlines (next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const upcomingDeadlines = await Task.find({
            ...(isManager ? {} : { assignedTo: userId }),
            dueDate: { $gte: now, $lte: nextWeek },
            status: { $ne: 'Done' }
        })
        .populate('project', 'name')
        .populate('assignedTo', 'name')
        .select('title dueDate priority project assignedTo')
        .sort({ dueDate: 1 })
        .limit(5);

        // 10. Get project status distribution
        const projectsByStatus = await Project.aggregate([
            { $match: projectMatch },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const responseData = {
            activeProjectsCount,
            totalProjects,
            completedProjectsCount,
            completionRate,
            recentProjects,
            projectTaskStats,
            taskTrends,
            overdueTasks,
            upcomingDeadlines,
            projectsByStatus
        };
        
        console.log('📈 Project Stats API Response for', req.user.email, '(Role:', req.user.role + '):');
        console.log('   Is Manager:', isManager);
        console.log('   Active Projects:', activeProjectsCount, '| Total:', totalProjects);
        console.log('   Recent Projects:', recentProjects.length);
        
        res.json(responseData);

    } catch (error) {
        console.error("Error fetching project stats:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;