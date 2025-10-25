import mongoose from 'mongoose';

const taskReportSchema = new mongoose.Schema({
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    workAccomplished: {
        type: String,
        required: true,
        trim: true
    },
    challengesFaced: {
        type: String,
        trim: true
    },
    timeSpent: {
        type: Number,
        default: 0
    },
    completionPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    nextSteps: {
        type: String,
        trim: true
    },
    blockers: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'acknowledged'],
        default: 'pending'
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewComment: {
        type: String,
        trim: true
    },
    reviewedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for efficient queries
taskReportSchema.index({ task: 1, status: 1 });
taskReportSchema.index({ submittedBy: 1 });
taskReportSchema.index({ createdAt: -1 });

const TaskReport = mongoose.model('TaskReport', taskReportSchema);

export default TaskReport;
