import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getProjectStats, updateProject, getStatusRequests } from '../services/api';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, Legend, CartesianGrid
} from 'recharts';
import { 
    Menu, CheckSquare, Users, FolderKanban, 
    TrendingUp, Clock, AlertCircle, Calendar, Target, 
    ArrowUpRight, Activity, Edit, Plus, FileText, 
    BarChart3, Eye, PlayCircle, CheckCircle2
} from 'lucide-react';
import CreateProjectModal from '../components/CreateProjectModal.jsx';
import UpdateTaskStatus from '../components/UpdateTaskStatus.jsx';
import './DashboardPage.css';

const DashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // State to hold task stats from the API
    const [stats, setStats] = useState({
        completedTasksData: [],
        efficiencyData: [],
        scheduleData: [],
        todoCount: 0,
        inProgressCount: 0,
        doneCount: 0
    });
    
    // State for project statistics
    const [projectStats, setProjectStats] = useState({
        activeProjectsCount: 0,
        totalProjects: 0,
        completedProjectsCount: 0,
        completionRate: 0,
        recentProjects: [],
        projectTaskStats: [],
        taskTrends: [],
        overdueTasks: 0,
        upcomingDeadlines: [],
        projectsByStatus: []
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [backupCodesWarning, setBackupCodesWarning] = useState(null);
    const [apiError, setApiError] = useState(null);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    
    // Modal states
    const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
    const [showUpdateTaskModal, setShowUpdateTaskModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    
    // Case-insensitive role check (database has lowercase 'manager')
    const isManager = user?.role?.toLowerCase() === 'manager';

    useEffect(() => {
        const fetchStats = async () => {
            try {
                console.log('📊 Fetching dashboard stats...');
                console.log('🔑 User Info:', { name: user?.name, email: user?.email, role: user?.role });
                const response = await getDashboardStats();
                console.log('✅ Dashboard stats response:', response);
                console.log('📦 Response data:', response?.data);
                if (response && response.data) {
                    setStats(response.data);
                    console.log('✅ Stats set successfully:', response.data);
                    console.log('📊 Todo:', response.data.todoCount, 'In Progress:', response.data.inProgressCount, 'Done:', response.data.doneCount);
                    setApiError(null); // Clear any previous errors
                } else {
                    console.error('❌ Invalid response structure:', response);
                    setApiError('Invalid data received from server');
                }
            } catch (error) {
                console.error("❌ Could not fetch dashboard stats:", error);
                console.error('Error details:', error.response || error.message);
                console.error('Full error:', error);
                if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
                    setApiError('Cannot connect to server. Please ensure the backend is running.');
                } else if (error.response?.status === 500) {
                    setApiError('Server error. MongoDB might not be running. Check DATABASE_SETUP_GUIDE.md');
                } else {
                    setApiError('Failed to load dashboard data');
                }
            }
        };
        
        const fetchProjectStats = async () => {
            try {
                console.log('📈 Fetching project stats...');
                const response = await getProjectStats();
                console.log('✅ Project stats response:', response);
                console.log('📦 Response data:', response?.data);
                if (response && response.data) {
                    setProjectStats(response.data);
                    console.log('✅ Project stats set successfully:', response.data);
                    console.log('📊 Active Projects:', response.data.activeProjectsCount, 'Total:', response.data.totalProjects);
                    console.log('📊 Completed Projects:', response.data.completedProjectsCount);
                    console.log('📊 Completion Rate:', response.data.completionRate + '%');
                    console.log('📊 Recent Projects:', response.data.recentProjects?.length);
                    console.log('📊 Project Task Stats:', response.data.projectTaskStats);
                    console.log('📊 Project Task Stats Length:', response.data.projectTaskStats?.length);
                    
                    // 🔍 DEBUG: Log each recent project's progress field
                    console.log('🔍 CHECKING RECENT PROJECTS PROGRESS:');
                    response.data.recentProjects?.forEach((proj, idx) => {
                        console.log(`  Project #${idx + 1}: "${proj.name}"`, {
                            progress: proj.progress,
                            progressData: proj.progressData,
                            totalTasks: proj.totalTasks,
                            completedTasks: proj.completedTasks,
                            hasProgressField: 'progress' in proj,
                            hasProgressDataField: 'progressData' in proj
                        });
                    });
                    
                    setApiError(null); // Clear any previous errors
                } else {
                    console.error('❌ Invalid response structure:', response);
                    setApiError('Invalid project data received from server');
                }
            } catch (error) {
                console.error("❌ Could not fetch project stats:", error);
                console.error('Error details:', error.response || error.message);
                console.error('Full error:', error);
                if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
                    setApiError('Cannot connect to server. Please ensure the backend is running.');
                } else if (error.response?.status === 500) {
                    setApiError('Server error. MongoDB might not be running. Check DATABASE_SETUP_GUIDE.md');
                } else {
                    setApiError('Failed to load project statistics');
                }
            }
        };
        
        const fetchPendingRequests = async () => {
            if (!isManager) return;
            try {
                console.log('⏳ Fetching pending status requests...');
                const response = await getStatusRequests({ status: 'pending' });
                const data = response.data || response;
                const count = Array.isArray(data) ? data.length : 0;
                setPendingRequestsCount(count);
                console.log('✅ Pending requests count:', count);
            } catch (error) {
                console.error('❌ Could not fetch pending requests:', error);
                setPendingRequestsCount(0);
            }
        };
        
        Promise.all([fetchStats(), fetchProjectStats(), fetchPendingRequests()]).finally(() => {
            setIsLoading(false);
        });
        
        // Check for backup codes warning from login
        const warningData = sessionStorage.getItem('backupCodesWarning');
        if (warningData) {
            const warning = JSON.parse(warningData);
            setBackupCodesWarning(warning);
            sessionStorage.removeItem('backupCodesWarning');
        }
    }, []);
    
    // Handler functions
    const handleTaskUpdate = async (updatedTask) => {
        // Refresh dashboard stats after task update
        try {
            const { data } = await getDashboardStats();
            setStats(data);
            const { data: projectData } = await getProjectStats();
            setProjectStats(projectData);
        } catch (error) {
            console.error("Error refreshing stats:", error);
        }
    };
    
    const handleProjectCreated = async () => {
        // Refresh project stats after creating a project
        try {
            const { data } = await getProjectStats();
            setProjectStats(data);
        } catch (error) {
            console.error("Error refreshing project stats:", error);
        }
    };

    // Quick update project status (small inline helper for managers)
    const quickUpdateProjectStatus = async (projectId) => {
        try {
            const newStatus = window.prompt('Enter new project status (Ongoing, Completed, On Hold):');
            if (!newStatus) return; // cancelled

            const normalized = newStatus.trim();
            const allowed = ['Ongoing', 'Completed', 'On Hold'];
            if (!allowed.includes(normalized)) {
                alert('Invalid status. Please enter one of: Ongoing, Completed, On Hold');
                return;
            }

            await updateProject(projectId, { status: normalized });
            // Refresh stats
            const { data } = await getProjectStats();
            setProjectStats(data);
        } catch (error) {
            console.error('Error updating project status:', error);
            alert('Failed to update project status. See console for details.');
        }
    };

    if (!user || isLoading) return <div className="loading-state">Loading Dashboard...</div>;

    // Chart colors
    const CHART_COLORS = ['#0ea5e9', '#a855f7', '#f97316', '#22c55e', '#ec4899', '#14b8a6'];
    
    // Project status pie chart data
    const projectStatusData = (projectStats.projectsByStatus || []).map((item, index) => ({
        name: item._id || 'Unknown',
        value: item.count,
        fill: CHART_COLORS[index % CHART_COLORS.length]
    }));

    // Task trends line chart data - transform aggregated data
    const taskTrendsData = (projectStats.taskTrends || []).reduce((acc, item) => {
        const date = item._id.date;
        const status = item._id.status;
        const existing = acc.find(d => d.date === date);
        
        if (existing) {
            existing[status] = item.count;
        } else {
            acc.push({
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                [status]: item.count
            });
        }
        return acc;
    }, []);

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <button className="menu-button"><Menu size={24} /></button>
                    <div className="breadcrumbs">
                        <span>Dashboard</span> / <span>Overview</span>
                    </div>
                </div>
                <div className="header-right">
                    <span className="user-greeting">Welcome back, {user.name}!</span>
                </div>
            </header>
            
            {backupCodesWarning && (
                <div className="backup-codes-warning">
                    <div className="warning-content">
                        <span className="warning-icon">⚠️</span>
                        <div className="warning-text">
                            <strong>Security Alert:</strong> {backupCodesWarning.message}
                        </div>
                        <button className="warning-action" onClick={() => navigate('/settings?focus=security')}>
                            Generate New Codes
                        </button>
                        <button className="warning-dismiss" onClick={() => setBackupCodesWarning(null)}>×</button>
                    </div>
                </div>
            )}

            {apiError && (
                <div className="api-error-banner">
                    <div className="error-content">
                        <span className="error-icon">🔴</span>
                        <div className="error-text">
                            <strong>Connection Error:</strong> {apiError}
                        </div>
                        <button className="error-action" onClick={() => window.location.reload()}>
                            Retry
                        </button>
                        <button className="error-dismiss" onClick={() => setApiError(null)}>×</button>
                    </div>
                </div>
            )}

            <div className="dashboard-content">
                {/* Top Stats Cards */}
                <div className="stats-overview">
                    <div className="stat-card stat-projects">
                        <div className="stat-icon">
                            <FolderKanban size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{projectStats.activeProjectsCount || 0}</h3>
                            <p>Active Projects</p>
                        </div>
                        <div className="stat-trend positive">
                            <ArrowUpRight size={16} />
                            <span>{projectStats.totalProjects || 0} total</span>
                        </div>
                    </div>

                    <div className="stat-card stat-tasks">
                        <div className="stat-icon">
                            <CheckSquare size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{stats.inProgressCount || 0}</h3>
                            <p>Tasks In Progress</p>
                        </div>
                        <div className="stat-trend">
                            <Activity size={16} />
                            <span>{stats.todoCount || 0} pending</span>
                        </div>
                    </div>

                    <div className="stat-card stat-completion">
                        <div className="stat-icon">
                            <Target size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{projectStats.completionRate || 0}%</h3>
                            <p>Completion Rate</p>
                        </div>
                        <div className="stat-trend positive">
                            <TrendingUp size={16} />
                            <span>{stats.doneCount || 0} done</span>
                        </div>
                    </div>

                    <div className="stat-card stat-overdue">
                        <div className="stat-icon">
                            <AlertCircle size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{projectStats.overdueTasks || 0}</h3>
                            <p>Overdue Tasks</p>
                        </div>
                        <div className="stat-trend warning">
                            <Clock size={16} />
                            <span>Needs attention</span>
                        </div>
                    </div>

                    {isManager && (
                        <div 
                            className="stat-card stat-requests clickable" 
                            onClick={() => navigate('/status-requests')}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="stat-icon">
                                <Clock size={24} />
                            </div>
                            <div className="stat-info">
                                <h3>{pendingRequestsCount}</h3>
                                <p>Pending Requests</p>
                            </div>
                            <div className="stat-trend">
                                <ArrowUpRight size={16} />
                                <span>Review now</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="dashboard-grid">
                    {/* Left Column - Projects & Tasks */}
                    <div className="dashboard-main">
                        {/* Project Overview Section */}
                        <div className="dashboard-section">
                            <div className="section-header">
                                <h2>Project Overview</h2>
                                <div className="section-header-actions">
                                    {isManager && (
                                        <button 
                                            className="create-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowCreateProjectModal(true);
                                            }}
                                        >
                                            <Plus size={16} />
                                            New Project
                                        </button>
                                    )}
                                    <button className="view-all-btn" onClick={() => navigate('/projects')}>
                                        View All →
                                    </button>
                                </div>
                            </div>
                            
                            {/* Recent Projects */}
                            <div className="recent-projects">
                                {(projectStats.recentProjects || []).slice(0, 4).map(project => (
                                    <div 
                                        key={project._id} 
                                        className="project-card"
                                    >
                                        <div 
                                            className="project-card-content"
                                            onClick={() => navigate(`/projects/${project._id}`)}
                                        >
                                            <div className="project-card-header">
                                                <h3>{project.name}</h3>
                                                <span className={`project-status ${project.status.toLowerCase().replace(' ', '-')}`}>
                                                    {project.status}
                                                </span>
                                            </div>
                                            <div className="project-card-meta">
                                                <span className={`priority-badge ${project.priority.toLowerCase()}`}>
                                                    {project.priority}
                                                </span>
                                                <span className="project-dates">
                                                    <Calendar size={14} />
                                                    {new Date(project.startDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="project-progress">
                                                <div className="progress-bar">
                                                    <div 
                                                        className="progress-fill" 
                                                        style={{ width: `${project.progress || 0}%` }}
                                                    ></div>
                                                </div>
                                                <span className="progress-text">{project.progress || 0}%</span>
                                            </div>
                                        </div>
                                        
                                        {/* Project Action Buttons */}
                                        <div className="project-card-actions">
                                            <button
                                                className="project-action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/projects/${project._id}`);
                                                }}
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                                View
                                            </button>
                                            <button
                                                className="project-action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/monitor-progress/${project._id}`);
                                                }}
                                                title="Monitor Progress"
                                            >
                                                <BarChart3 size={16} />
                                                Monitor
                                            </button>
                                            {isManager && (
                                                <button
                                                    className="project-action-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/projects/${project._id}?edit=true`);
                                                    }}
                                                    title="Edit Project"
                                                >
                                                    <Edit size={16} />
                                                    Edit
                                                </button>
                                            )}
                                                {isManager && (
                                                    <button
                                                        className="project-action-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            quickUpdateProjectStatus(project._id);
                                                        }}
                                                        title="Quick Status"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                        Status
                                                    </button>
                                                )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Project Task Distribution */}
                        <div className="dashboard-section">
                            <div className="section-header">
                                <h2>Project Task Statistics</h2>
                                <p className="section-subtitle">Task distribution across projects</p>
                            </div>
                            <div className="project-task-stats-wrapper">
                                {(projectStats.projectTaskStats || []).length > 0 ? (
                                    <div className="project-cards-grid">
                                        {(projectStats.projectTaskStats || []).map((project, index) => {
                                            const totalTasks = (project.completedTasks || 0) + (project.inProgressTasks || 0) + (project.todoTasks || 0);
                                            const completionPercentage = totalTasks > 0 ? Math.round((project.completedTasks / totalTasks) * 100) : 0;
                                            
                                            return (
                                                <div key={index} className="project-stats-card">
                                                    <div className="project-card-header">
                                                        <div className="project-card-icon">
                                                            <FolderKanban size={20} />
                                                        </div>
                                                        <h3 className="project-card-title">{project.projectName}</h3>
                                                    </div>
                                                    
                                                    <div className="project-card-stats">
                                                        <div className="total-tasks-count">
                                                            <span className="count-number">{totalTasks}</span>
                                                            <span className="count-label">Total Tasks</span>
                                                        </div>
                                                        
                                                        <div className="completion-circle">
                                                            <svg width="80" height="80" viewBox="0 0 80 80">
                                                                <circle
                                                                    cx="40"
                                                                    cy="40"
                                                                    r="32"
                                                                    fill="none"
                                                                    stroke="rgba(0,0,0,0.05)"
                                                                    strokeWidth="8"
                                                                />
                                                                <circle
                                                                    cx="40"
                                                                    cy="40"
                                                                    r="32"
                                                                    fill="none"
                                                                    stroke="#22c55e"
                                                                    strokeWidth="8"
                                                                    strokeDasharray={`${(completionPercentage / 100) * 201} 201`}
                                                                    strokeLinecap="round"
                                                                    transform="rotate(-90 40 40)"
                                                                />
                                                                <text x="40" y="40" textAnchor="middle" dy="7" fontSize="18" fontWeight="600" fill="#22c55e">
                                                                    {completionPercentage}%
                                                                </text>
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="project-card-breakdown">
                                                        <div className="task-breakdown-item completed">
                                                            <div className="breakdown-dot"></div>
                                                            <span className="breakdown-label">Completed</span>
                                                            <span className="breakdown-count">{project.completedTasks || 0}</span>
                                                        </div>
                                                        <div className="task-breakdown-item in-progress">
                                                            <div className="breakdown-dot"></div>
                                                            <span className="breakdown-label">In Progress</span>
                                                            <span className="breakdown-count">{project.inProgressTasks || 0}</span>
                                                        </div>
                                                        <div className="task-breakdown-item todo">
                                                            <div className="breakdown-dot"></div>
                                                            <span className="breakdown-label">To Do</span>
                                                            <span className="breakdown-count">{project.todoTasks || 0}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="project-card-progress-bar">
                                                        <div className="progress-bar-container">
                                                            <div 
                                                                className="progress-segment completed" 
                                                                style={{ width: `${totalTasks > 0 ? (project.completedTasks / totalTasks) * 100 : 0}%` }}
                                                            ></div>
                                                            <div 
                                                                className="progress-segment in-progress" 
                                                                style={{ width: `${totalTasks > 0 ? (project.inProgressTasks / totalTasks) * 100 : 0}%` }}
                                                            ></div>
                                                            <div 
                                                                className="progress-segment todo" 
                                                                style={{ width: `${totalTasks > 0 ? (project.todoTasks / totalTasks) * 100 : 0}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="empty-chart-state">
                                        <BarChart3 size={48} strokeWidth={1.5} />
                                        <p>No project task data available</p>
                                        <span>Tasks will appear here once projects have assigned tasks</span>
                                        <div className="empty-actions">
                                            <button
                                                className="action-btn"
                                                onClick={async () => {
                                                    setIsLoading(true);
                                                    try {
                                                        const { data } = await getProjectStats();
                                                        setProjectStats(data);
                                                    } catch (err) {
                                                        console.error('Failed to refresh project stats', err);
                                                        setApiError('Failed to refresh project stats');
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                            >
                                                Refresh
                                            </button>
                                            {isManager && (
                                                <button
                                                    className="action-btn action-create"
                                                    onClick={() => setShowCreateProjectModal(true)}
                                                >
                                                    <Plus size={12} />
                                                    Create Project
                                                </button>
                                            )}
                                            <button className="action-btn" onClick={() => navigate('/projects')}>
                                                View Projects
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Task Overview */}
                        <div className="dashboard-section">
                            <div className="section-header">
                                <h2>Your Tasks Overview</h2>
                                <button className="view-all-btn" onClick={() => navigate('/tasks')}>
                                    View All Tasks →
                                </button>
                            </div>
                            <div className="mini-kanban">
                                <div className="mini-column todo">
                                    <h3>To Do</h3>
                                    <div className="task-count">{stats.todoCount || 0}</div>
                                    <p className="column-desc">Pending tasks</p>
                                </div>
                                <div className="mini-column in-progress">
                                    <h3>In Progress</h3>
                                    <div className="task-count">{stats.inProgressCount || 0}</div>
                                    <p className="column-desc">Active work</p>
                                </div>
                                <div className="mini-column completed">
                                    <h3>Done</h3>
                                    <div className="task-count">{stats.doneCount || 0}</div>
                                    <p className="column-desc">Completed</p>
                                </div>
                            </div>
                        </div>

                        {/* Upcoming Deadlines */}
                        <div className="dashboard-section">
                            <div className="section-header">
                                <h2>Upcoming Deadlines</h2>
                            </div>
                            <div className="deadlines-list">
                                {(projectStats.upcomingDeadlines || []).length > 0 ? (
                                    (projectStats.upcomingDeadlines || []).map(task => (
                                        <div key={task._id} className="deadline-item">
                                            <div className="deadline-icon">
                                                <Calendar size={18} />
                                            </div>
                                            <div className="deadline-info">
                                                <h4>{task.title}</h4>
                                                <p>{task.project?.name || 'No Project'}</p>
                                            </div>
                                            <div className="deadline-meta">
                                                <span className={`priority-badge ${task.priority.toLowerCase()}`}>
                                                    {task.priority}
                                                </span>
                                                <span className="deadline-date">
                                                    {new Date(task.dueDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="deadline-actions">
                                                <button
                                                    className="deadline-action-btn"
                                                    onClick={() => {
                                                        setSelectedTask(task);
                                                        setShowUpdateTaskModal(true);
                                                    }}
                                                    title="Update Status"
                                                >
                                                    <PlayCircle size={14} />
                                                    Update
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-deadlines">No upcoming deadlines in the next 7 days</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar - Charts & Analytics */}
                    <aside className="dashboard-sidebar">
                        {/* Project Status Distribution */}
                        <div className="widget">
                            <h3 className="widget-title">Project Status</h3>
                            <div className="chart-container">
                                {projectStatusData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie
                                                data={projectStatusData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={70}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {projectStatusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="no-data">No project data available</p>
                                )}
                            </div>
                        </div>

                        {/* Task Trends */}
                        <div className="widget">
                            <h3 className="widget-title">Task Trends (7 Days)</h3>
                            <div className="chart-container">
                                {taskTrendsData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={taskTrendsData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                                            <XAxis 
                                                dataKey="date" 
                                                stroke="var(--text-secondary)" 
                                                fontSize={10}
                                            />
                                            <YAxis stroke="var(--text-secondary)" fontSize={10} />
                                            <Tooltip 
                                                contentStyle={{
                                                    backgroundColor: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                }}
                                            />
                                            <Line type="monotone" dataKey="To Do" stroke="#f97316" strokeWidth={2} />
                                            <Line type="monotone" dataKey="In Progress" stroke="#0ea5e9" strokeWidth={2} />
                                            <Line type="monotone" dataKey="Done" stroke="#22c55e" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="no-data">No trend data available</p>
                                )}
                            </div>
                        </div>

                        {/* Team Efficiency */}
                        <div className="widget">
                            <h3 className="widget-title">Team Efficiency</h3>
                            <div className="efficiency-grid">
                                {Array.isArray(stats.efficiencyData) && stats.efficiencyData.length > 0 ? (
                                    stats.efficiencyData.map(item => (
                                        <div key={item.name} className="efficiency-item">
                                            <div className="pie-chart-wrapper">
                                                <ResponsiveContainer width={70} height={70}>
                                                    <PieChart>
                                                        <Pie 
                                                            data={[{ value: item.value }, { value: 100 - item.value }]} 
                                                            dataKey="value" 
                                                            innerRadius={22} 
                                                            outerRadius={30} 
                                                            startAngle={90} 
                                                            endAngle={450} 
                                                            stroke="none"
                                                        >
                                                            <Cell fill={item.fill || '#8A63D2'} />
                                                            <Cell fill="var(--bg-secondary)" />
                                                        </Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <span className="efficiency-value">{item.value}%</span>
                                            </div>
                                            <span className="efficiency-author">{item.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-data">No efficiency data available</p>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="widget">
                            <h3 className="widget-title">Quick Actions</h3>
                            <div className="quick-actions-sidebar">
                                {isManager && (
                                    <button 
                                        className="action-btn action-create"
                                        onClick={() => setShowCreateProjectModal(true)}
                                    >
                                        <Plus size={18} />
                                        <span>Create Project</span>
                                    </button>
                                )}
                                <button className="action-btn action-primary" onClick={() => navigate('/projects')}>
                                    <FolderKanban size={18} />
                                    <span>View Projects</span>
                                </button>
                                <button className="action-btn action-secondary" onClick={() => navigate('/team')}>
                                    <Users size={18} />
                                    <span>Team Chat</span>
                                </button>
                                <button className="action-btn action-success" onClick={() => navigate('/tasks')}>
                                    <CheckSquare size={18} />
                                    <span>All Tasks</span>
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
            
            {/* Modals */}
            {showCreateProjectModal && (
                <CreateProjectModal 
                    onClose={() => setShowCreateProjectModal(false)}
                    onProjectCreated={handleProjectCreated}
                />
            )}
            
            {showUpdateTaskModal && selectedTask && (
                <UpdateTaskStatus
                    task={selectedTask}
                    onUpdate={(updatedTask) => {
                        handleTaskUpdate(updatedTask);
                        setShowUpdateTaskModal(false);
                        setSelectedTask(null);
                    }}
                    onClose={() => {
                        setShowUpdateTaskModal(false);
                        setSelectedTask(null);
                    }}
                />
            )}
        </div>
    );
};

export default DashboardPage;
