import React, { useState } from 'react';
import { FileText, Calendar, Clock, Target, TrendingUp, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import './SubmitReport.css';

const SubmitReport = ({ task, onSubmit, onClose }) => {
  const [reportData, setReportData] = useState({
    workAccomplished: '',
    challengesFaced: '',
    timeSpent: task?.actualHours || 0,
    nextSteps: '',
    blockers: '',
    estimatedCompletion: 100
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setReportData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reportData.workAccomplished.trim()) {
      setError('Please describe your accomplishments');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Submit report with new API
      const report = {
        taskId: task?._id,
        workAccomplished: reportData.workAccomplished,
        challengesFaced: reportData.challengesFaced,
        timeSpent: parseFloat(reportData.timeSpent) || 0,
        completionPercentage: parseInt(reportData.estimatedCompletion) || 0,
        nextSteps: reportData.nextSteps,
        blockers: reportData.blockers
      };

      await onSubmit(report);
      onClose();
    } catch (err) {
      setError('Failed to submit report. Please try again.');
      console.error('Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgressColor = () => {
    const completion = parseInt(reportData.estimatedCompletion);
    if (completion >= 80) return '#10b981';
    if (completion >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="submit-report-backdrop" onClick={onClose}>
      <div className="submit-report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-header">
          <div className="header-content">
            <FileText size={28} />
            <div>
              <h2>Submit Progress Report</h2>
              <p className="task-name">{task?.title || 'General Report'}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="report-form">
          {/* Work Accomplished Section */}
          <div className="form-group">
            <label htmlFor="workAccomplished">
              <CheckCircle2 size={18} />
              What have you accomplished? *
            </label>
            <textarea
              id="workAccomplished"
              name="workAccomplished"
              value={reportData.workAccomplished}
              onChange={handleChange}
              placeholder="Describe completed tasks, features implemented, bugs fixed, etc.&#10;Example:&#10;- Implemented user authentication with JWT&#10;- Fixed critical bug in payment processing&#10;- Completed 5 unit tests for API endpoints"
              rows="5"
              required
            />
            <span className="help-text">List all tasks, features, and improvements completed</span>
          </div>

          {/* Challenges Faced */}
          <div className="form-group">
            <label htmlFor="challengesFaced">
              <AlertCircle size={18} />
              Challenges & Issues Faced
            </label>
            <textarea
              id="challengesFaced"
              name="challengesFaced"
              value={reportData.challengesFaced}
              onChange={handleChange}
              placeholder="Describe any technical challenges, blockers, or difficulties encountered&#10;Example:&#10;- Integration with third-party API was complex&#10;- Database query optimization took longer than expected&#10;- Had to refactor code due to changing requirements"
              rows="4"
            />
            <span className="help-text">Document problems solved and lessons learned</span>
          </div>

          {/* Time Metrics */}
          <div className="metrics-row">
            <div className="form-group half">
              <label htmlFor="timeSpent">
                <Clock size={18} />
                Total Hours Spent
              </label>
              <input
                type="number"
                id="timeSpent"
                name="timeSpent"
                value={reportData.timeSpent}
                onChange={handleChange}
                min="0"
                step="0.5"
                placeholder="0.0"
              />
              {task?.estimatedHours && (
                <span className="help-text">
                  Estimated: {task.estimatedHours}h 
                  ({Math.round((reportData.timeSpent / task.estimatedHours) * 100)}%)
                </span>
              )}
            </div>

            <div className="form-group half">
              <label htmlFor="estimatedCompletion">
                <Target size={18} />
                Task Completion %
              </label>
              <div className="completion-input">
                <input
                  type="range"
                  id="estimatedCompletion"
                  name="estimatedCompletion"
                  value={reportData.estimatedCompletion}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="5"
                />
                <div 
                  className="completion-value" 
                  style={{ color: getProgressColor() }}
                >
                  {reportData.estimatedCompletion}%
                </div>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${reportData.estimatedCompletion}%`,
                    backgroundColor: getProgressColor()
                  }}
                />
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="form-group">
            <label htmlFor="nextSteps">
              <TrendingUp size={18} />
              Next Steps & Plan
            </label>
            <textarea
              id="nextSteps"
              name="nextSteps"
              value={reportData.nextSteps}
              onChange={handleChange}
              placeholder="What are your plans for the next work period?&#10;Example:&#10;- Start implementing dashboard analytics&#10;- Review code with team lead&#10;- Begin integration testing phase"
              rows="4"
            />
            <span className="help-text">Outline your immediate next steps and goals</span>
          </div>

          {/* Blockers */}
          <div className="form-group">
            <label htmlFor="blockers">
              <AlertCircle size={18} />
              Current Blockers (if any)
            </label>
            <textarea
              id="blockers"
              name="blockers"
              value={reportData.blockers}
              onChange={handleChange}
              placeholder="Any blockers preventing progress?&#10;Example:&#10;- Waiting for API documentation from backend team&#10;- Need design approval for new feature&#10;- Server access required for deployment testing"
              rows="3"
            />
            <span className="help-text">Help managers identify and resolve obstacles</span>
          </div>

          {/* Report Summary */}
          <div className="report-summary">
            <h4>Report Summary</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <Calendar size={16} />
                <span>
                  <strong>Date:</strong> {new Date().toLocaleDateString()}
                </span>
              </div>
              <div className="summary-item">
                <Clock size={16} />
                <span>
                  <strong>Time:</strong> {reportData.timeSpent}h
                </span>
              </div>
              <div className="summary-item">
                <Target size={16} />
                <span>
                  <strong>Progress:</strong> {reportData.estimatedCompletion}%
                </span>
              </div>
              <div className="summary-item">
                <FileText size={16} />
                <span>
                  <strong>Task:</strong> {task?.title || 'General'}
                </span>
              </div>
            </div>
          </div>

          {/* Best Practices Info */}
          <div className="best-practices">
            <h4>💡 Report Best Practices</h4>
            <ul>
              <li>✅ Be specific and quantify achievements (e.g., "Fixed 5 bugs" not "Fixed bugs")</li>
              <li>✅ Include metrics and measurements where possible</li>
              <li>✅ Document blockers early so managers can help resolve them</li>
              <li>✅ Keep next steps actionable and time-bound</li>
              <li>✅ Be honest about challenges - it helps the team improve</li>
            </ul>
          </div>

          {error && <div className="error-message">{error}</div>}

          {/* Submit Actions */}
          <div className="form-actions">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-cancel"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitReport;
