
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../services/api'; // <-- Import the new API function
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Menu, MoreHorizontal, CheckSquare, Users } from 'lucide-react';
import './DashboardPage.css';

const DashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    // State to hold real data from the API
    const [stats, setStats] = useState({
        completedTasksData: [],
        efficiencyData: [],
        scheduleData: []
    });
    // Defensive: ensure stats properties are always arrays
    const completedTasksData = Array.isArray(stats.completedTasksData) ? stats.completedTasksData : [];
    const efficiencyData = Array.isArray(stats.efficiencyData) ? stats.efficiencyData : [];
    const scheduleData = Array.isArray(stats.scheduleData) ? stats.scheduleData : [];
    const [isLoading, setIsLoading] = useState(true);
    const [backupCodesWarning, setBackupCodesWarning] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await getDashboardStats();
                setStats(data);
            } catch (error) {
                console.error("Could not fetch dashboard stats", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
        // Check for backup codes warning from login
        const warningData = sessionStorage.getItem('backupCodesWarning');
        if (warningData) {
            const warning = JSON.parse(warningData);
            setBackupCodesWarning(warning);
            sessionStorage.removeItem('backupCodesWarning');
        }
    }, []);

    if (!user || isLoading) return <div className="loading-state">Loading Dashboard...</div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <button className="menu-button"><Menu size={24} /></button>
                    <div className="breadcrumbs">
                        <span>Tasks</span> / <span>Today</span>
                    </div>
                </div>
                <div className="header-right">
                    <a href="#" className="header-link">About</a>
                    <a href="#" className="header-link">Language</a>
                    <a href="#" className="header-link">Conditions</a>
                </div>
            </header>
            <div className="dashboard-grid">
                {/* All dashboard content wrapped in a single parent div */}
                <div className="dashboard-content-wrapper">
                    {backupCodesWarning && (
                        <div className="backup-codes-warning">
                            <div className="warning-content">
                                <span className="warning-icon">⚠️</span>
                                <div className="warning-text">
                                    <strong>Security Alert:</strong> {backupCodesWarning.message}
                                </div>
                                <button className="warning-action" onClick={() => navigate('/settings?focus=security')}>Generate New Codes</button>
                                <button className="warning-dismiss" onClick={() => setBackupCodesWarning(null)}>×</button>
                            </div>
                        </div>
                    )}
                    <main className="dashboard-main">
                        <h1 className="main-title">Task Management Dashboard</h1>
                        <div className="dashboard-task-preview">
                            <div className="task-board-header">
                                <h2>Your Tasks Overview</h2>
                                <button className="view-all-btn" onClick={() => navigate('/tasks')}>View All Tasks →</button>
                            </div>
                            <div className="mini-kanban">
                                <div className="mini-column">
                                    <h3>To Do</h3>
                                    <div className="task-count">{stats.todoCount || 0}</div>
                                    <p className="column-desc">Pending tasks</p>
                                </div>
                                <div className="mini-column">
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
                            <div className="quick-actions">
                                <button className="action-card" onClick={() => navigate('/projects')}>
                                    <CheckSquare size={24} />
                                    <span>View Projects</span>
                                </button>
                                <button className="action-card" onClick={() => navigate('/team')}>
                                    <Users size={24} />
                                    <span>Team Chat</span>
                                </button>
                            </div>
                        </div>
                    </main>
                    <aside className="dashboard-sidebar">
                        <div className="widget">
                            <h3 className="widget-title">Completed Tasks</h3>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={150}>
                                    <BarChart data={completedTasksData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                        <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{fill: 'rgba(255, 255, 255, 0.1)'}} contentStyle={{backgroundColor: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px'}}/>
                                        <Bar dataKey="tasks" radius={[4, 4, 0, 0]}>
                                            {completedTasksData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill || '#8A63D2'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="widget">
                            <h3 className="widget-title">Efficiency</h3>
                            <div className="efficiency-grid">
                                {efficiencyData.map(item => (
                                    <div key={item.name} className="efficiency-item">
                                        <div className="pie-chart-wrapper">
                                            <ResponsiveContainer width={70} height={70}>
                                                <PieChart>
                                                    <Pie data={[{ value: item.value }, { value: 100 - item.value }]} dataKey="value" innerRadius={22} outerRadius={30} startAngle={90} endAngle={450} stroke="none">
                                                        <Cell fill={item.fill || '#8A63D2'}/>
                                                        <Cell fill="var(--bg-secondary)"/>
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <span className="efficiency-value">{item.value}</span>
                                        </div>
                                        <span className="efficiency-author">{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="widget">
                            <h3 className="widget-title">Plan</h3>
                            <ul className="schedule-list">
                                {scheduleData.map(item => (
                                    <li key={item.time}>
                                        <span className="schedule-time">{item.time}</span>
                                        <span className="schedule-task">{item.task}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;