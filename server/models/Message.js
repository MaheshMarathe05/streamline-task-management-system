import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  messageType: { 
    type: String, 
    enum: ['team', 'direct'], 
    required: true, 
    default: 'team',
    index: true 
  },
  teamId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Team', 
    index: true,
    required: function() { return this.messageType === 'team'; }
  },
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    index: true,
    required: function() { return this.messageType === 'direct'; }
  },
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

// Indexes for efficient queries
messageSchema.index({ teamId: 1, timestamp: -1 });
messageSchema.index({ teamId: 1, userId: 1 });
messageSchema.index({ messageType: 1, userId: 1, recipientId: 1 });
messageSchema.index({ messageType: 1, recipientId: 1, timestamp: -1 });

export default mongoose.model('Message', messageSchema);

