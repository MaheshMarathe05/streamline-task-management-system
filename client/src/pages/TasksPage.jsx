
import React, { useState, useEffect, useCallback } from 'react';
import { getTasks, createTask, getProjects, getTeamMembers, deleteTask, updateTask, createStatusRequest, submitTaskReport } from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import { Plus, X, Trash2, Edit, FileText, Clock } from 'lucide-react';
import UpdateTaskStatus from '../components/UpdateTaskStatus.jsx';
import SubmitReport from '../components/SubmitReport.jsx';
import TaskEditModal from '../components/TaskEditModal.jsx';
import StatusRequestModal from '../components/StatusRequestModal.jsx';
import './TasksPage.css';

// --- Create Task Modal Component ---
const CreateTaskModal = ({ projects, team, setShowModal, setTasks, setColumns, isManager, currentUserId }) => {
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    // Debug logging
    console.log('CreateTaskModal - Projects available:', projects);
    console.log('CreateTaskModal - Team members available:', team);
    console.log('CreateTaskModal - isManager:', isManager);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSuccess('');

        const taskData = {
            title: e.target.title.value,
            project: e.target.project.value,
            // For employees, always assign to themselves; for managers, use the selected assignee
            assignedTo: isManager ? e.target.assignedTo?.value : currentUserId,
            priority: e.target.priority.value,
            status: 'To Do',
        };
        
        // Add description if provided
        if (e.target.description?.value) {
            taskData.description = e.target.description.value;
        }

        try {
            const res = await createTask(taskData);
            setIsSubmitting(false);

            if (res._id || res.data?._id) {
                const newTask = res._id ? res : res.data;
                setSuccess('Task created successfully!');
                setColumns(prevColumns => ({
                    ...prevColumns,
                    'To Do': [newTask, ...prevColumns['To Do']]
                }));
                setTasks(prevTasks => [newTask, ...prevTasks]);
                
                // Close modal after 1.5 seconds to show success message
                setTimeout(() => {
                    setShowModal(false);
                }, 1500);
            } else {
                setError('Failed to create task. Please try again.');
                setIsSubmitting(false);
            }
        } catch (err) {
            console.error('Task creation error:', err);
            setError(err.response?.data?.error || 'Failed to create task');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Create New Task</h2>
                    <button onClick={() => setShowModal(false)} className="close-button"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <input name="title" placeholder="Task Title" required />
                    <textarea name="description" placeholder="Task Description (optional)" rows="3"></textarea>
                    <select name="project" required>
                        <option value="">Select Project</option>
                        {projects && projects.length > 0 ? (
                            projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)
                        ) : (
                            <option disabled>No projects available</option>
                        )}
                    </select>
                    {isManager && (
                        <select name="assignedTo" required>
                            <option value="">Assign To</option>
                            {team && team.length > 0 ? (
                                team.map(m => <option key={m._id} value={m._id}>{m.name}</option>)
                            ) : (
                                <option disabled>No team members available</option>
                            )}
                        </select>
                    )}
                    {!isManager && (
                        <div className="info-message">
                            ℹ️ This task will be assigned to you
                        </div>
                    )}
                    <select name="priority" defaultValue="Medium">
                        <option>Low</option><option>Medium</option><option>High</option>
                    </select>
                    {error && <p className="error-message">{error}</p>}
                    {success && <p className="success-message">{success}</p>}
                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? <div className="spinner"></div> : 'Create Task'}
                    </button>
                </form>
            </div>
        </div>
    );
};


// --- Main Tasks Page Component ---
const TasksPage = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [columns, setColumns] = useState({ 'To Do': [], 'In Progress': [], 'Done': [] });
    const [projects, setProjects] = useState([]);
    const [team, setTeam] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showStatusRequestModal, setShowStatusRequestModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const isManager = user?.role === 'manager';
    const [userProjects, setUserProjects] = useState([]); // Employee's assigned projects

    const groupTasksByStatus = useCallback((tasksToGroup) => {
        return tasksToGroup.reduce((acc, task) => {
            const { status } = task;
            if (!acc[status]) acc[status] = [];
            acc[status].push(task);
            return acc;
        }, { 'To Do': [], 'In Progress': [], 'Done': [] });
    }, []);

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        
        try {
            await deleteTask(taskId);
            // Remove task from state
            setTasks(prevTasks => prevTasks.filter(t => t._id !== taskId));
            setColumns(prevColumns => {
                const newColumns = { ...prevColumns };
                Object.keys(newColumns).forEach(status => {
                    newColumns[status] = newColumns[status].filter(t => t._id !== taskId);
                });
                return newColumns;
            });
        } catch (error) {
            console.error('Failed to delete task:', error);
            alert('Failed to delete task. Please try again.');
        }
    };

    const handleUpdateTask = (updatedTask) => {
        setTasks(prevTasks => prevTasks.map(t => t._id === updatedTask._id ? updatedTask : t));
        setColumns(groupTasksByStatus(tasks.map(t => t._id === updatedTask._id ? updatedTask : t)));
    };

    const handleEditTask = async (taskId, updateData) => {
        try {
            const response = await updateTask(taskId, updateData);
            const updatedTask = response.data || response;
            
            // Update task in state
            setTasks(prevTasks => prevTasks.map(t => t._id === taskId ? updatedTask : t));
            setColumns(prevColumns => {
                const newColumns = { ...prevColumns };
                Object.keys(newColumns).forEach(status => {
                    newColumns[status] = newColumns[status].map(t => 
                        t._id === taskId ? updatedTask : t
                    );
                });
                return newColumns;
            });
            
            return updatedTask;
        } catch (error) {
            console.error('Failed to update task:', error);
            throw error;
        }
    };

    const handleSubmitReport = async (reportData) => {
        try {
            await submitTaskReport(reportData);
            alert('Report submitted successfully! Your manager will review it soon.');
        } catch (error) {
            console.error('Failed to submit report:', error);
            alert('Failed to submit report. Please try again.');
        }
    };

    const handleStatusRequest = async (requestData) => {
        try {
            await createStatusRequest(requestData);
            setShowStatusRequestModal(false);
            alert('Status change request submitted successfully! Your manager will review it.');
        } catch (error) {
            console.error('Failed to submit status request:', error);
            throw error;
        }
    };
    
    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            getTasks(),
            isManager ? getProjects() : getProjects(), // Employees also need their projects
            isManager ? getTeamMembers() : Promise.resolve({ data: [] })
        ]).then(([tasksRes, projectsRes, teamRes]) => {
            console.log('TasksPage - Raw responses:', { tasksRes, projectsRes, teamRes });
            console.log('TasksPage - Projects data:', projectsRes.data);
            console.log('TasksPage - Team data:', teamRes.data);
            
            const tasksData = tasksRes.data || tasksRes;
            setTasks(tasksData);
            setColumns(groupTasksByStatus(tasksData));
            
            // For managers, set all projects; for employees, set their assigned projects
            const projectsData = projectsRes.data || [];
            setProjects(projectsData);
            
            // For employees, extract unique projects from their tasks
            if (!isManager) {
                const employeeProjects = [...new Set(tasksData.map(t => t.project).filter(p => p))];
                setUserProjects(employeeProjects);
            }
            
            setTeam(teamRes.data || []);
        }).catch(err => {
            console.error("Failed to load task page data", err);
        }).finally(() => {
            setIsLoading(false);
        });
    }, [isManager, groupTasksByStatus]);
    
    if (isLoading) {
        return <div className="loading-state">Loading tasks...</div>
    }

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Task Board</h1>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={18}/> {isManager ? 'Create Task' : 'Create Task for Myself'}
                </button>
            </header>
            <div className="kanban-board">
                {Object.keys(columns).map(status => (
                    <div key={status} className="kanban-column">
                        <h3 className="column-title">{status} <span>({columns[status].length})</span></h3>
                        <div className="column-tasks">
                            {columns[status].map(task => (
                                <div key={task._id} className="kanban-task">
                                    <div className="task-header-row">
                                        <p className="task-title">{task.title}</p>
                                        <div className="task-actions">
                                            {isManager && (
                                                <>
                                                    <button 
                                                        className="task-action-btn delete-btn"
                                                        onClick={() => handleDeleteTask(task._id)}
                                                        title="Delete task"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <button 
                                                        className="task-action-btn update-btn"
                                                        onClick={() => {
                                                            setSelectedTask(task);
                                                            setShowUpdateModal(true);
                                                        }}
                                                        title="Update task"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                </>
                                            )}
                                            {!isManager && (
                                                <>
                                                    <button 
                                                        className="task-action-btn edit-btn"
                                                        onClick={() => {
                                                            setSelectedTask(task);
                                                            setShowEditModal(true);
                                                        }}
                                                        title="Edit task details"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button 
                                                        className="task-action-btn request-btn"
                                                        onClick={() => {
                                                            setSelectedTask(task);
                                                            setShowStatusRequestModal(true);
                                                        }}
                                                        title="Request status change"
                                                    >
                                                        <Clock size={16} />
                                                    </button>
                                                    <button 
                                                        className="task-action-btn report-btn"
                                                        onClick={() => {
                                                            setSelectedTask(task);
                                                            setShowReportModal(true);
                                                        }}
                                                        title="Submit report"
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="task-footer">
                                        <div className="assignee-info">
                                            Assigned to: {task.assignedTo?.name || 'Unassigned'}
                                        </div>
                                        <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {showCreateModal && <CreateTaskModal projects={projects} team={team} setShowModal={setShowCreateModal} setTasks={setTasks} setColumns={setColumns} isManager={isManager} currentUserId={user?._id} />}
            {showUpdateModal && selectedTask && (
                <UpdateTaskStatus 
                    task={selectedTask}
                    onUpdate={handleUpdateTask}
                    onClose={() => {
                        setShowUpdateModal(false);
                        setSelectedTask(null);
                    }}
                />
            )}
            {showReportModal && selectedTask && (
                <SubmitReport
                    task={selectedTask}
                    onSubmit={handleSubmitReport}
                    onClose={() => {
                        setShowReportModal(false);
                        setSelectedTask(null);
                    }}
                />
            )}
            {showEditModal && selectedTask && (
                <TaskEditModal
                    task={selectedTask}
                    isManager={isManager}
                    onUpdate={(updateData) => handleEditTask(selectedTask._id, updateData)}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedTask(null);
                    }}
                />
            )}
            {showStatusRequestModal && selectedTask && (
                <StatusRequestModal
                    task={selectedTask}
                    onSubmit={handleStatusRequest}
                    onClose={() => {
                        setShowStatusRequestModal(false);
                        setSelectedTask(null);
                    }}
                />
            )}
        </div>
    );
};

export default TasksPage;