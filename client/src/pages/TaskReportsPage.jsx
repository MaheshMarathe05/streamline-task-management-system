import React, { useState, useEffect } from 'react';
import { getTaskReports, reviewTaskReport, acknowledgeTaskReport } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FileText, CheckCircle, Eye, AlertCircle, Send, Calendar, User, Clock, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import './TaskReportsPage.css';

const TaskReportsPage = () => {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('pending'); // pending, reviewed, acknowledged, all
    const [reviewModal, setReviewModal] = useState({ show: false, report: null });
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedReports, setExpandedReports] = useState(new Set());

    const isManager = user?.role === 'manager';

    useEffect(() => {
        fetchReports();
    }, []);

    useEffect(() => {
        filterReports();
    }, [filter, reports]);

    const fetchReports = async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await getTaskReports();
            const data = response.data?.reports || response.reports || [];
            setReports(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch task reports:', err);
            setError('Failed to load task reports. Please try again.');
            setReports([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterReports = () => {
        if (filter === 'all') {
            setFilteredReports(reports);
        } else {
            setFilteredReports(reports.filter(report => report.status === filter));
        }
    };

    const handleReviewClick = (report) => {
        setReviewModal({ show: true, report });
        setReviewComment('');
    };

    const handleReviewSubmit = async () => {
        if (!reviewModal.report) return;

        try {
            setIsSubmitting(true);
            setError('');
            
            await reviewTaskReport(reviewModal.report._id, reviewComment);

            // Refresh the reports list
            await fetchReports();

            // Close modal
            setReviewModal({ show: false, report: null });
            setReviewComment('');
        } catch (err) {
            console.error('Failed to review report:', err);
            setError('Failed to submit review. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAcknowledge = async (reportId) => {
        try {
            setError('');
            await acknowledgeTaskReport(reportId);
            await fetchReports();
        } catch (err) {
            console.error('Failed to acknowledge report:', err);
            setError('Failed to acknowledge report. Please try again.');
        }
    };

    const toggleExpanded = (reportId) => {
        setExpandedReports(prev => {
            const newSet = new Set(prev);
            if (newSet.has(reportId)) {
                newSet.delete(reportId);
            } else {
                newSet.add(reportId);
            }
            return newSet;
        });
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'pending':
                return 'status-badge-warning';
            case 'reviewed':
                return 'status-badge-info';
            case 'acknowledged':
                return 'status-badge-success';
            default:
                return '';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return <Clock size={16} />;
            case 'reviewed':
                return <Eye size={16} />;
            case 'acknowledged':
                return <CheckCircle size={16} />;
            default:
                return <AlertCircle size={16} />;
        }
    };

    const getCompletionColor = (percentage) => {
        if (percentage >= 80) return '#22c55e';
        if (percentage >= 50) return '#f59e0b';
        return '#ef4444';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <div className="task-reports-page">
                <div className="loading-container">
                    <div className="spinner-large"></div>
                    <p>Loading task reports...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="task-reports-page">
            <div className="page-header">
                <div className="header-content">
                    <h1>
                        <FileText size={32} />
                        Task Reports
                    </h1>
                    <p className="subtitle">
                        {isManager 
                            ? 'Review progress reports from your team'
                            : 'Track your submitted progress reports'}
                    </p>
                </div>
                <button className="btn-refresh" onClick={fetchReports}>
                    Refresh
                </button>
            </div>

            {error && (
                <div className="error-banner">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    <Clock size={16} />
                    Pending ({reports.filter(r => r.status === 'pending').length})
                </button>
                <button
                    className={`filter-tab ${filter === 'reviewed' ? 'active' : ''}`}
                    onClick={() => setFilter('reviewed')}
                >
                    <Eye size={16} />
                    Reviewed ({reports.filter(r => r.status === 'reviewed').length})
                </button>
                <button
                    className={`filter-tab ${filter === 'acknowledged' ? 'active' : ''}`}
                    onClick={() => setFilter('acknowledged')}
                >
                    <CheckCircle size={16} />
                    Acknowledged ({reports.filter(r => r.status === 'acknowledged').length})
                </button>
                <button
                    className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    <FileText size={16} />
                    All ({reports.length})
                </button>
            </div>

            {/* Reports List */}
            <div className="reports-container">
                {filteredReports.length === 0 ? (
                    <div className="empty-state">
                        <AlertCircle size={48} />
                        <h3>No {filter !== 'all' ? filter : ''} reports found</h3>
                        <p>
                            {filter === 'pending' && isManager
                                ? 'All progress reports have been reviewed.'
                                : filter === 'pending'
                                ? "You don't have any pending reports."
                                : `No ${filter} reports to display.`}
                        </p>
                    </div>
                ) : (
                    <div className="reports-grid">
                        {filteredReports.map((report) => (
                            <div key={report._id} className={`report-card ${report.status}`}>
                                <div className="report-header">
                                    <div className="report-title-row">
                                        <h3>{report.task?.title || 'Task Deleted'}</h3>
                                        <span className={`status-badge ${getStatusBadgeClass(report.status)}`}>
                                            {getStatusIcon(report.status)}
                                            {report.status}
                                        </span>
                                    </div>
                                    <div className="report-meta">
                                        <span className="meta-item">
                                            <User size={14} />
                                            {report.submittedBy?.name || 'Unknown'}
                                        </span>
                                        <span className="meta-item">
                                            <Calendar size={14} />
                                            {formatDate(report.createdAt)}
                                        </span>
                                        {report.task?.project && (
                                            <span className="meta-item">
                                                <FileText size={14} />
                                                {report.task.project.name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="report-body">
                                    {/* Progress Stats */}
                                    <div className="progress-stats">
                                        <div className="stat-item">
                                            <Target size={18} />
                                            <div>
                                                <label>Completion</label>
                                                <strong style={{ color: getCompletionColor(report.completionPercentage) }}>
                                                    {report.completionPercentage}%
                                                </strong>
                                            </div>
                                        </div>
                                        <div className="stat-item">
                                            <Clock size={18} />
                                            <div>
                                                <label>Time Spent</label>
                                                <strong>{report.timeSpent || 0}h</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Work Accomplished */}
                                    <div className="report-section">
                                        <label>
                                            <CheckCircle size={16} />
                                            Work Accomplished
                                        </label>
                                        <p className={expandedReports.has(report._id) ? 'expanded' : 'collapsed'}>
                                            {report.workAccomplished}
                                        </p>
                                        {report.workAccomplished.length > 150 && (
                                            <button 
                                                className="expand-btn"
                                                onClick={() => toggleExpanded(report._id)}
                                            >
                                                {expandedReports.has(report._id) ? 'Show less' : 'Show more'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Challenges */}
                                    {report.challengesFaced && (
                                        <div className="report-section">
                                            <label>
                                                <AlertTriangle size={16} />
                                                Challenges Faced
                                            </label>
                                            <p>{report.challengesFaced}</p>
                                        </div>
                                    )}

                                    {/* Next Steps */}
                                    {report.nextSteps && (
                                        <div className="report-section">
                                            <label>
                                                <TrendingUp size={16} />
                                                Next Steps
                                            </label>
                                            <p>{report.nextSteps}</p>
                                        </div>
                                    )}

                                    {/* Blockers */}
                                    {report.blockers && (
                                        <div className="report-section blockers">
                                            <label>
                                                <AlertCircle size={16} />
                                                Current Blockers
                                            </label>
                                            <p>{report.blockers}</p>
                                        </div>
                                    )}

                                    {/* Review Section */}
                                    {report.status !== 'pending' && report.reviewedBy && (
                                        <div className="review-section">
                                            <div className="review-header">
                                                <strong>Reviewed by {report.reviewedBy.name}</strong>
                                                <span className="review-date">
                                                    {formatDate(report.reviewedAt)}
                                                </span>
                                            </div>
                                            {report.reviewComment && (
                                                <p className="review-comment">{report.reviewComment}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Manager Actions */}
                                {isManager && report.status === 'pending' && (
                                    <div className="report-actions">
                                        <button
                                            className="btn-review"
                                            onClick={() => handleReviewClick(report)}
                                        >
                                            <Eye size={18} />
                                            Review
                                        </button>
                                        <button
                                            className="btn-acknowledge"
                                            onClick={() => handleAcknowledge(report._id)}
                                        >
                                            <CheckCircle size={18} />
                                            Quick Acknowledge
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {reviewModal.show && (
                <div className="modal-backdrop" onClick={() => !isSubmitting && setReviewModal({ show: false, report: null })}>
                    <div className="modal-content review-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                <Eye size={24} />
                                Review Report
                            </h2>
                            <button
                                className="close-btn"
                                onClick={() => !isSubmitting && setReviewModal({ show: false, report: null })}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="review-summary">
                                <h3>{reviewModal.report?.task?.title}</h3>
                                <div className="summary-stats">
                                    <span className="stat">
                                        <Target size={16} />
                                        {reviewModal.report?.completionPercentage}% Complete
                                    </span>
                                    <span className="stat">
                                        <Clock size={16} />
                                        {reviewModal.report?.timeSpent}h Spent
                                    </span>
                                </div>
                                <div className="submitter-info">
                                    Submitted by: <strong>{reviewModal.report?.submittedBy?.name}</strong>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="reviewComment">
                                    Feedback & Comments
                                </label>
                                <textarea
                                    id="reviewComment"
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="Provide feedback on the progress report..."
                                    rows={5}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={() => setReviewModal({ show: false, report: null })}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary btn-review"
                                onClick={handleReviewSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <div className="spinner"></div>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Submit Review
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskReportsPage;
