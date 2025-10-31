
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CheckSquare, Users, LogOut, Settings, Zap, Bell, Clock, FileText, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import './Layout.css';

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const isManager = user?.role === 'manager';

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="app-layout">
            <aside className="main-sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <Zap size={28} />
                    </div>
                    <div className="company-name">Streamline</div>
                    <div className="company-tagline">Task Management</div>
                </div>
                
                <nav className="sidebar-nav">
                    <div className="sidebar-section">
                        <div className="section-title">Main</div>
                        <NavLink to="/dashboard" className="nav-link">
                            <LayoutDashboard className="nav-icon" />
                            <span className="nav-text">Dashboard</span>
                        </NavLink>
                        <NavLink to="/projects" className="nav-link">
                            <FolderKanban className="nav-icon" />
                            <span className="nav-text">Projects</span>
                        </NavLink>
                        <NavLink to="/tasks" className="nav-link">
                            <CheckSquare className="nav-icon" />
                            <span className="nav-text">Tasks</span>
                        </NavLink>
                        <NavLink to="/status-requests" className="nav-link">
                            <Clock className="nav-icon" />
                            <span className="nav-text">Status Requests</span>
                        </NavLink>
                        <NavLink to="/task-reports" className="nav-link">
                            <FileText className="nav-icon" />
                            <span className="nav-text">Task Reports</span>
                        </NavLink>
                        <NavLink to="/messages" className="nav-link">
                            <MessageCircle className="nav-icon" />
                            <span className="nav-text">Messages</span>
                        </NavLink>
                        <NavLink to="/notifications" className="nav-link">
                            <Bell className="nav-icon" />
                            <span className="nav-text">Notifications</span>
                        </NavLink>
                        {isManager && (
                            <NavLink to="/team" className="nav-link">
                                <Users className="nav-icon" />
                                <span className="nav-text">Team</span>
                            </NavLink>
                        )}
                    </div>
                </nav>
                
                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="user-avatar">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="user-info">
                            <div className="user-name">{user?.name || 'User'}</div>
                            <div className="user-role">{user?.role || 'employee'}</div>
                        </div>
                    </div>
                    
                    <NavLink to="/settings" className="nav-link">
                        <Settings className="nav-icon" />
                        <span className="nav-text">Settings</span>
                    </NavLink>
                    <button onClick={handleLogout} className="nav-link">
                        <LogOut className="nav-icon" />
                        <span className="nav-text">Logout</span>
                    </button>
                </div>
            </aside>
            <div className="content-wrapper">
                <div className="content-inner">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;