
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx'; 

// Page Imports with .jsx extension
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import AccountRecoveryPage from './pages/AccountRecoveryPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import MonitorProgressPage from './pages/MonitorProgressPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import StatusRequestsPage from './pages/StatusRequestsPage.jsx';
import TaskReportsPage from './pages/TaskReportsPage.jsx';

// Component Imports with .jsx extension
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  // Apply saved theme on component mount and ensure it persists
  useEffect(() => {
    const applyTheme = () => {
      const saved = localStorage.getItem('themeMode') || 'dark';
      const root = document.documentElement;
      
      if (saved === 'light') {
        root.setAttribute('data-theme', 'light');
      } else if (saved === 'dark') {
        root.setAttribute('data-theme', 'dark');
      } else if (saved === 'system') {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        if (mql.matches) {
          root.setAttribute('data-theme', 'dark');
        } else {
          root.setAttribute('data-theme', 'light');
        }
      }
    };
    
    applyTheme();
    
    // Listen for system theme changes if using system mode
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (localStorage.getItem('themeMode') === 'system') {
        applyTheme();
      }
    };
    
    mql.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mql.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);
  
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/recovery" element={<AccountRecoveryPage />} />
          
          {/* Protected Routes inside the main Layout */}
          <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><Layout><ProjectsPage /></Layout></ProtectedRoute>} />
          <Route path="/projects/:projectId" element={<ProtectedRoute><Layout><ProjectDetailPage /></Layout></ProtectedRoute>} />
          <Route path="/projects/:projectId/monitor" element={<ProtectedRoute><Layout><MonitorProgressPage /></Layout></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><Layout><TasksPage /></Layout></ProtectedRoute>} />
          <Route path="/status-requests" element={<ProtectedRoute><Layout><StatusRequestsPage /></Layout></ProtectedRoute>} />
          <Route path="/task-reports" element={<ProtectedRoute><Layout><TaskReportsPage /></Layout></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><Layout><TeamPage /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;