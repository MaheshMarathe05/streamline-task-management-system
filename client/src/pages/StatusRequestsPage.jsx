import React, { useState, useEffect } from 'react';
import { getStatusRequests, reviewStatusRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Clock, CheckCircle, XCircle, AlertCircle, Send, Calendar, User, FileText } from 'lucide-react';
import './StatusRequestsPage.css';

const StatusRequestsPage = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
    const [reviewModal, setReviewModal] = useState({ show: false, request: null, action: null });
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isManager = user?.role === 'manager';

    useEffect(() => {
        fetchRequests();
    }, []);

    useEffect(() => {
        filterRequests();
    }, [filter, requests]);

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await getStatusRequests();
            const data = response.data || response;
            setRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch status requests:', err);
            setError('Failed to load status requests. Please try again.');
            setRequests([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterRequests = () => {
        if (filter === 'all') {
            setFilteredRequests(requests);
        } else {
            setFilteredRequests(requests.filter(req => req.status === filter));
        }
    };

    const handleReviewClick = (request, action) => {
        setReviewModal({ show: true, request, action });
        setReviewComment('');
    };

    const handleReviewSubmit = async () => {
        if (!reviewModal.request) return;

        try {
            setIsSubmitting(true);
            setError('');
            
            await reviewStatusRequest(
                reviewModal.request._id,
                reviewModal.action,
                reviewComment
            );

            // Refresh the requests list
            await fetchRequests();

            // Close modal
            setReviewModal({ show: false, request: null, action: null });
            setReviewComment('');
        } catch (err) {
            console.error('Failed to review request:', err);
            setError('Failed to submit review. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'pending':
                return 'status-badge-warning';
            case 'approved':
                return 'status-badge-success';
            case 'rejected':
                return 'status-badge-danger';
            default:
                return '';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return <Clock size={16} />;
            case 'approved':
                return <CheckCircle size={16} />;
            case 'rejected':
                return <XCircle size={16} />;
            default:
                return <AlertCircle size={16} />;
        }
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
            <div className="status-requests-page">
                <div className="loading-container">
                    <div className="spinner-large"></div>
                    <p>Loading status requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="status-requests-page">
            <div className="page-header">
                <div className="header-content">
                    <h1>
                        <Clock size={32} />
                        Status Change Requests
                    </h1>
                    <p className="subtitle">
                        {isManager 
                            ? 'Review and approve status change requests from your team'
                            : 'Track your status change requests'}
                    </p>
                </div>
                <button className="btn-refresh" onClick={fetchRequests}>
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
                    Pending ({requests.filter(r => r.status === 'pending').length})
                </button>
                <button
                    className={`filter-tab ${filter === 'approved' ? 'active' : ''}`}
                    onClick={() => setFilter('approved')}
                >
                    <CheckCircle size={16} />
                    Approved ({requests.filter(r => r.status === 'approved').length})
                </button>
                <button
                    className={`filter-tab ${filter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setFilter('rejected')}
                >
                    <XCircle size={16} />
                    Rejected ({requests.filter(r => r.status === 'rejected').length})
                </button>
                <button
                    className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    <FileText size={16} />
                    All ({requests.length})
                </button>
            </div>

            {/* Requests List */}
            <div className="requests-container">
                {filteredRequests.length === 0 ? (
                    <div className="empty-state">
                        <AlertCircle size={48} />
                        <h3>No {filter !== 'all' ? filter : ''} requests found</h3>
                        <p>
                            {filter === 'pending' && isManager
                                ? 'All status change requests have been reviewed.'
                                : filter === 'pending'
                                ? "You don't have any pending requests."
                                : `No ${filter} requests to display.`}
                        </p>
                    </div>
                ) : (
                    <div className="requests-grid">
                        {filteredRequests.map((request) => (
                            <div key={request._id} className={`request-card ${request.status}`}>
                                <div className="request-header">
                                    <div className="request-title-row">
                                        <h3>{request.task?.title || 'Task Deleted'}</h3>
                                        <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                                            {getStatusIcon(request.status)}
                                            {request.status}
                                        </span>
                                    </div>
                                    <div className="request-meta">
                                        <span className="meta-item">
                                            <User size={14} />
                                            {request.requestedBy?.name || 'Unknown'}
                                        </span>
                                        <span className="meta-item">
                                            <Calendar size={14} />
                                            {formatDate(request.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                <div className="request-body">
                                    <div className="status-change-info">
                                        <div className="status-change-item">
                                            <label>Current Status:</label>
                                            <span className={`status-pill ${request.currentStatus.toLowerCase().replace(' ', '-')}`}>
                                                {request.currentStatus}
                                            </span>
                                        </div>
                                        <div className="status-arrow">→</div>
                                        <div className="status-change-item">
                                            <label>Requested Status:</label>
                                            <span className={`status-pill ${request.requestedStatus.toLowerCase().replace(' ', '-')}`}>
                                                {request.requestedStatus}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="reason-section">
                                        <label>Reason:</label>
                                        <p>{request.reason}</p>
                                    </div>

                                    {request.status !== 'pending' && (
                                        <div className="review-section">
                                            <div className="review-header">
                                                <strong>Review by {request.reviewedBy?.name || 'Unknown'}</strong>
                                                <span className="review-date">
                                                    {formatDate(request.reviewedAt)}
                                                </span>
                                            </div>
                                            {request.reviewComment && (
                                                <p className="review-comment">{request.reviewComment}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {request.status === 'pending' && isManager && (
                                    <div className="request-actions">
                                        <button
                                            className="btn-approve"
                                            onClick={() => handleReviewClick(request, 'approve')}
                                        >
                                            <CheckCircle size={18} />
                                            Approve
                                        </button>
                                        <button
                                            className="btn-reject"
                                            onClick={() => handleReviewClick(request, 'reject')}
                                        >
                                            <XCircle size={18} />
                                            Reject
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
                <div className="modal-backdrop" onClick={() => !isSubmitting && setReviewModal({ show: false, request: null, action: null })}>
                    <div className="modal-content review-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {reviewModal.action === 'approve' ? (
                                    <>
                                        <CheckCircle size={24} />
                                        Approve Request
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={24} />
                                        Reject Request
                                    </>
                                )}
                            </h2>
                            <button
                                className="close-btn"
                                onClick={() => !isSubmitting && setReviewModal({ show: false, request: null, action: null })}
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="review-summary">
                                <h3>{reviewModal.request?.task?.title}</h3>
                                <div className="status-change-preview">
                                    <span className={`status-pill ${reviewModal.request?.currentStatus.toLowerCase().replace(' ', '-')}`}>
                                        {reviewModal.request?.currentStatus}
                                    </span>
                                    <span className="arrow">→</span>
                                    <span className={`status-pill ${reviewModal.request?.requestedStatus.toLowerCase().replace(' ', '-')}`}>
                                        {reviewModal.request?.requestedStatus}
                                    </span>
                                </div>
                                <div className="requester-info">
                                    Requested by: <strong>{reviewModal.request?.requestedBy?.name}</strong>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="reviewComment">
                                    Comment (Optional)
                                </label>
                                <textarea
                                    id="reviewComment"
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder={`Add a ${reviewModal.action === 'approve' ? 'note' : 'reason'} for your decision...`}
                                    rows={4}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={() => setReviewModal({ show: false, request: null, action: null })}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                className={`btn-primary ${reviewModal.action === 'approve' ? 'btn-approve' : 'btn-reject'}`}
                                onClick={handleReviewSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <div className="spinner"></div>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        {reviewModal.action === 'approve' ? 'Approve' : 'Reject'}
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

export default StatusRequestsPage;
