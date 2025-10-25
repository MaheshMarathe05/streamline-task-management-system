import mongoose from 'mongoose';

const statusChangeRequestSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentStatus: {
    type: String,
    required: true,
    enum: ['To Do', 'In Progress', 'Done']
  },
  requestedStatus: {
    type: String,
    required: true,
    enum: ['To Do', 'In Progress', 'Done']
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewComment: {
    type: String
  },
  reviewedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
statusChangeRequestSchema.index({ task: 1, status: 1 });
statusChangeRequestSchema.index({ requestedBy: 1 });

export default mongoose.model('StatusChangeRequest', statusChangeRequestSchema);
