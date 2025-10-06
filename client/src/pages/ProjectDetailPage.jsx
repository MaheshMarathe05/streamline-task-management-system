import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../services/apiClient.js';
import { ArrowLeft, Calendar, Users, Target, Clock, BarChart3, CheckCircle2, AlertCircle, Play, Pause, Flag } from 'lucide-react';
import './ProjectDetailPage.css';

const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [commentValue, setCommentValue] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  useEffect(() => { if (projectId) load(); }, [projectId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const proj = await projectsApi.get(projectId);
      let projTasks = Array.isArray(proj.tasks) ? proj.tasks : [];
      if (!projTasks.length) { try { projTasks = await projectsApi.tasks(projectId); } catch {} }
      setProject(proj);
      setTasks(projTasks);
    } catch (e) { setError(e.message || 'Failed to load project'); }
    finally { setLoading(false); }
  }

  async function loadAnalytics() {
    try { const data = await projectsApi.analytics(projectId); setAnalytics(data); setShowAnalytics(true); }
    catch (e) { setError(prev => prev || 'Failed to load analytics'); }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentValue.trim()) return;
    setCommentSubmitting(true);
    try {
      const created = await projectsApi.comment(projectId, commentValue.trim());
      setProject(p => ({ ...p, comments: [created, ...(p?.comments||[])] }));
      setCommentValue('');
    } catch (e) { alert(e.message || 'Failed to add comment'); }
    finally { setCommentSubmitting(false); }
  }

  function statusIcon(status) {
    switch (status) {
      case 'Completed': return <CheckCircle2 className="status-icon completed" />;
      case 'Ongoing': return <Play className="status-icon ongoing" />;
      case 'On Hold': return <Pause className="status-icon on-hold" />;
      default: return <AlertCircle className="status-icon" />;
    }
  }

  if (loading) return <div className="project-detail-loading"><div className="loading-spinner"/>Loading project...</div>;
  if (error) return <div className="project-detail-error"><p>Error: {error}</p><button onClick={load}>Retry</button></div>;
  if (!project) return <div className="project-detail-error"><p>Project not found.</p></div>;

  return (
    <div className="project-detail-container">
      <div className="project-detail-header">
        <button onClick={() => navigate('/projects')} className="back-btn"><ArrowLeft size={18}/> Back</button>
        <div className="project-header-content">
          <div className="project-title-section">
            <h1 className="project-title">{project.name}</h1>
            <div className="project-badges">
              <span className={`status-badge ${project.status?.replace(/\s+/g,'-').toLowerCase()}`}>{statusIcon(project.status)}{project.status}</span>
              <span className={`priority-badge priority-${project.priority?.toLowerCase()}`}> <Flag size={14}/> {project.priority}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="project-meta-grid">
        <div className="meta-item"><Calendar size={16}/> Deadline: {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}</div>
        <div className="meta-item"><Users size={16}/> Members: {project.members?.length || 0}</div>
        <div className="meta-item"><Target size={16}/> Priority: {project.priority}</div>
        <div className="meta-item"><Clock size={16}/> Updated: {project.updatedAt ? new Date(project.updatedAt).toLocaleString() : '-'}</div>
      </div>

      <section className="project-section">
        <h2>Description</h2>
        <p>{project.description || 'No description provided.'}</p>
      </section>

      <section className="project-section">
        <h2>Tasks ({tasks.length})</h2>
        {tasks.length === 0 && <div className="empty">No tasks yet.</div>}
        <div className="tasks-list">
          {tasks.map(t => (
            <div key={t._id} className={`task-card status-${t.status?.toLowerCase().replace(/\s+/g,'-')}`}> 
              <div className="task-header">
                <strong>{t.title}</strong>
                <span className="status">{t.status}</span>
              </div>
              <div className="task-body">
                <p>{t.description}</p>
                <div className="meta-line">
                  {t.priority && <span>Priority: {t.priority}</span>}
                  {t.dueDate && <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>}
                  {t.assignedTo && <span>Assignee: {t.assignedTo.name}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="project-section comments-section">
        <h2>Comments</h2>
        <form onSubmit={submitComment} className="add-comment-form">
          <textarea value={commentValue} onChange={e=>setCommentValue(e.target.value)} placeholder="Add a comment" />
          <button disabled={commentSubmitting || !commentValue.trim()}>{commentSubmitting ? 'Posting...' : 'Post'}</button>
        </form>
        <div className="comments-list">
          {(project.comments||[]).length === 0 && <div className="empty">No comments yet.</div>}
          {(project.comments||[]).map(c => (
            <div key={c._id || c.createdAt} className="comment-item">
              <div className="comment-meta">{c.user?.name || 'User'} • {new Date(c.createdAt).toLocaleString()}</div>
              <div className="comment-text">{c.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="project-section analytics-section">
        <h2>Analytics</h2>
        {!showAnalytics && <button className="btn-secondary" onClick={loadAnalytics}><BarChart3 size={16}/> Load Analytics</button>}
        {showAnalytics && !analytics && <div>Loading analytics...</div>}
        {analytics && (
          <div className="analytics-grid">
            <div className="metric"><strong>Total Tasks</strong><span>{analytics.totalTasks}</span></div>
            <div className="metric"><strong>Completed</strong><span>{analytics.completedTasks}</span></div>
            <div className="metric"><strong>In Progress</strong><span>{analytics.inProgressTasks}</span></div>
            <div className="metric"><strong>To Do</strong><span>{analytics.todoTasks}</span></div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProjectDetailPage;