import express from 'express';
import Message from '../models/Message.js';
import Team from '../models/Team.js';
import { protect } from '../middleware/authMiddleware.js';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';

const router = express.Router();
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Encryption key - In production, use environment variable
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

// Encrypt message with compression
function encryptMessage(text) {
  try {
    // Compress the text first
    const compressed = zlib.gzipSync(text);
    
    // Then encrypt
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(compressed);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

// Decrypt and decompress message
function decryptMessage(encryptedText) {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    // Decompress
    const decompressed = zlib.gunzipSync(decrypted);
    return decompressed.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
}

// Get messages for a team
router.get('/:teamId', protect, async (req, res) => {
  try {
    const { teamId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before ? new Date(req.query.before) : new Date();

    console.log('📨 Fetching messages for team:', teamId);

    // Check if user is member of this team
    const team = await Team.findById(teamId);
    if (!team) {
      console.log('❌ Team not found:', teamId);
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    console.log('Team details:', { 
      teamName: team.name, 
      manager: team.manager,
      members: team.members,
      currentUser: req.user._id 
    });

    // Check if user is manager or a member of the team
    const isManager = team.manager.toString() === req.user._id.toString();
    const isMember = team.members.some(m => m.toString() === req.user._id.toString());
    
    if (!isManager && !isMember) {
      console.log('❌ User not a member or manager of team:', req.user._id, teamId);
      return res.status(403).json({ success: false, error: 'Not a member of this team' });
    }

    console.log('✅ User is team', isManager ? 'manager' : 'member', '- fetching messages...');

    // Fetch messages
    const messages = await Message.find({
      teamId,
      timestamp: { $lt: before }
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('userId', 'name email')
      .lean();

    console.log(`📬 Found ${messages.length} messages`);

    // Decrypt messages
    const decryptedMessages = messages.map(msg => {
      try {
        return {
          ...msg,
          text: decryptMessage(msg.text),
          _encrypted: true
        };
      } catch (error) {
        console.error('Failed to decrypt message:', msg._id, error.message);
        return {
          ...msg,
          text: '[Message decryption failed]',
          _encrypted: false
        };
      }
    });

    res.json({
      success: true,
      messages: decryptedMessages.reverse(),
      hasMore: messages.length === limit
    });
  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages', details: error.message });
  }
});

// Send a message
router.post('/:teamId', protect, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { text, file } = req.body;

    console.log('📤 Sending message to team:', teamId);

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }

    // Check if user is member of this team
    const team = await Team.findById(teamId);
    if (!team) {
      console.log('❌ Team not found:', teamId);
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    // Check if user is manager or a member of the team
    const isManager = team.manager.toString() === req.user._id.toString();
    const isMember = team.members.some(m => m.toString() === req.user._id.toString());
    
    if (!isManager && !isMember) {
      console.log('❌ User not a member or manager of team');
      return res.status(403).json({ success: false, error: 'Not a member of this team' });
    }

    console.log('✅ Encrypting and compressing message...');

    // Encrypt and compress the message
    const encryptedText = encryptMessage(text.trim());

    console.log('✅ Creating message document...');

    // Create message
    const message = new Message({
      teamId,
      userId: req.user._id,
      text: encryptedText,
      file,
      timestamp: new Date()
    });

    await message.save();
    await message.populate('userId', 'name email');

    console.log('✅ Message sent successfully');

    // Return decrypted message to sender
    const response = {
      ...message.toObject(),
      text: text.trim(),
      _encrypted: true
    };

    res.json({ success: true, message: response });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message', details: error.message });
  }
});

// Mark messages as read
router.patch('/:teamId/read', protect, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Message IDs required' });
    }

    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        teamId,
        userId: { $ne: req.user._id }
      },
      {
        $addToSet: { readBy: req.user._id }
      }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark messages as read' });
  }
});

// Delete a message (only sender can delete)
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findOne({
      _id: messageId,
      userId: req.user._id
    });

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found or unauthorized' });
    }

    await message.deleteOne();

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

// Get message stats for a team
router.get('/:teamId/stats', protect, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Check if user is member of this team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    // Check if user is manager or a member of the team
    const isManager = team.manager.toString() === req.user._id.toString();
    const isMember = team.members.some(m => m.toString() === req.user._id.toString());
    
    if (!isManager && !isMember) {
      return res.status(403).json({ success: false, error: 'Not a member of this team' });
    }

    const totalMessages = await Message.countDocuments({ teamId });
    const unreadCount = await Message.countDocuments({
      teamId,
      userId: { $ne: req.user._id },
      readBy: { $ne: req.user._id }
    });

    const lastMessage = await Message.findOne({ teamId })
      .sort({ timestamp: -1 })
      .populate('userId', 'name');

    res.json({
      success: true,
      stats: {
        totalMessages,
        unreadCount,
        lastMessage: lastMessage ? {
          sender: lastMessage.userId.name,
          timestamp: lastMessage.timestamp
        } : null
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;
