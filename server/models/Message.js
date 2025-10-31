import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required: true }, // Encrypted and compressed text
  file: { type: String }, // Optional: file attachment URL
  timestamp: { type: Date, default: Date.now, index: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users who have read this message
  edited: { type: Boolean, default: false },
  editedAt: { type: Date }
}, {
  timestamps: true
});

// Index for efficient queries
messageSchema.index({ teamId: 1, timestamp: -1 });
messageSchema.index({ teamId: 1, userId: 1 });

export default mongoose.model('Message', messageSchema);

