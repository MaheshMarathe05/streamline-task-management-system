import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import './TaskEditModal.css';

const TaskEditModal = ({ task, onUpdate, onClose, isManager }) => {
    const [formData, setFormData] = useState({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'Medium',
        estimatedHours: task.estimatedHours || '',
        actualHours: task.actualHours || '',
        tags: task.tags?.join(', ') || ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            // Prepare update data
            const updateData = {
                title: formData.title,
                description: formData.description,
                priority: formData.priority,
                estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
                actualHours: formData.actualHours ? parseInt(formData.actualHours) : undefined,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : []
            };

            // Remove undefined values
            Object.keys(updateData).forEach(key => 
                updateData[key] === undefined && delete updateData[key]
            );

            await onUpdate(updateData);
            setSuccess('Task updated successfully!');
            
            // Close after showing success message
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            console.error('Task update error:', err);
            setError(err.response?.data?.error || 'Failed to update task');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content task-edit-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Task</h2>
                    <button onClick={onClose} className="close-button" type="button">
                        <X size={24}/>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="title">Task Title *</label>
                        <input
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Task Title"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Task Description"
                            rows="4"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="priority">Priority</label>
                            <select
                                id="priority"
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="estimatedHours">Estimated Hours</label>
                            <input
                                id="estimatedHours"
                                name="estimatedHours"
                                type="number"
                                min="0"
                                value={formData.estimatedHours}
                                onChange={handleChange}
                                placeholder="0"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="actualHours">Actual Hours</label>
                            <input
                                id="actualHours"
                                name="actualHours"
                                type="number"
                                min="0"
                                value={formData.actualHours}
                                onChange={handleChange}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="tags">Tags (comma-separated)</label>
                        <input
                            id="tags"
                            name="tags"
                            value={formData.tags}
                            onChange={handleChange}
                            placeholder="e.g., frontend, urgent, bug-fix"
                        />
                    </div>

                    <div className="task-info">
                        <p><strong>Project:</strong> {task.project?.name || 'N/A'}</p>
                        <p><strong>Assigned to:</strong> {task.assignedTo?.name || 'Unassigned'}</p>
                        <p><strong>Current Status:</strong> <span className={`status-badge ${task.status.toLowerCase().replace(' ', '-')}`}>{task.status}</span></p>
                    </div>

                    {error && <p className="error-message">{error}</p>}
                    {success && <p className="success-message">{success}</p>}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <div className="spinner"></div>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskEditModal;
