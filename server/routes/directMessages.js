import express from 'express';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';
import crypto from 'crypto';
import zlib from 'zlib';

const router = express.Router();

// Encryption key - should match the one in messages.js
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

// Encrypt message with compression
function encryptMessage(text) {
  try {
    const compressed = zlib.gzipSync(text);
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
    
    const decompressed = zlib.gunzipSync(decrypted);
    return decompressed.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
}

// GET /api/direct-messages/users - Get all users except current user for messaging
router.get('/users', protect, async (req, res) => {
  try {
    const users = await User.find({ 
      _id: { $ne: req.user._id } 
    })
    .select('name email role')
    .sort({ name: 1 });

    res.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to load users' });
  }
});

// GET /api/direct-messages/conversations - Get list of users with whom current user has conversations
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all direct messages where user is sender or recipient
    const messages = await Message.find({
      messageType: 'direct',
      $or: [
        { userId: userId },
        { recipientId: userId }
      ]
    })
    .populate('userId', 'name email role')
    .populate('recipientId', 'name email role')
    .sort({ timestamp: -1 });

    // Extract unique users and their last message
    const conversationsMap = new Map();
    
    for (const msg of messages) {
      const otherUser = msg.userId._id.toString() === userId.toString() 
        ? msg.recipientId 
        : msg.userId;
      
      const otherUserId = otherUser._id.toString();
      
      if (!conversationsMap.has(otherUserId)) {
        // Count unread messages from this user
        const unreadCount = await Message.countDocuments({
          messageType: 'direct',
          userId: otherUser._id,
          recipientId: userId,
          readBy: { $ne: userId }
        });

        conversationsMap.set(otherUserId, {
          user: {
            _id: otherUser._id,
            name: otherUser.name,
            email: otherUser.email,
            role: otherUser.role
          },
          lastMessage: {
            text: msg.text, // Keep encrypted for preview
            timestamp: msg.timestamp,
            fromMe: msg.userId._id.toString() === userId.toString()
          },
          unreadCount
        });
      }
    }

    const conversations = Array.from(conversationsMap.values());
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to load conversations' });
  }
});

// GET /api/direct-messages/:userId - Get direct messages with a specific user
router.get('/:userId', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    // Verify other user exists
    const otherUser = await User.findById(otherUserId).select('name email role');
    if (!otherUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get messages between these two users
    const messages = await Message.find({
      messageType: 'direct',
      $or: [
        { userId: currentUserId, recipientId: otherUserId },
        { userId: otherUserId, recipientId: currentUserId }
      ]
    })
    .populate('userId', 'name email role')
    .sort({ timestamp: 1 }); // Oldest first for chat display

    // Decrypt messages
    const decryptedMessages = messages.map(msg => {
      try {
        return {
          _id: msg._id,
          text: decryptMessage(msg.text),
          userId: msg.userId,
          timestamp: msg.timestamp,
          readBy: msg.readBy,
          edited: msg.edited,
          editedAt: msg.editedAt,
          isFromCurrentUser: msg.userId._id.toString() === currentUserId.toString()
        };
      } catch (error) {
        console.error('Failed to decrypt message:', msg._id);
        return {
          ...msg.toObject(),
          text: '[Encrypted message - decryption failed]',
          isFromCurrentUser: msg.userId._id.toString() === currentUserId.toString()
        };
      }
    });

    res.json({ success: true, messages: decryptedMessages, otherUser });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to load messages' });
  }
});

// POST /api/direct-messages/:userId - Send a direct message to a specific user
router.post('/:userId', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const recipientId = req.params.userId;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }

    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }

    // Encrypt the message
    const encryptedText = encryptMessage(text.trim());

    // Create message
    const message = new Message({
      messageType: 'direct',
      userId: currentUserId,
      recipientId: recipientId,
      text: encryptedText,
      readBy: [currentUserId] // Sender has read it
    });

    await message.save();
    const populated = await Message.findById(message._id)
      .populate('userId', 'name email role');

    res.status(201).json({
      success: true,
      message: {
        ...populated.toObject(),
        text: text.trim(), // Return unencrypted for sender
        isFromCurrentUser: true
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// PATCH /api/direct-messages/:userId/read - Mark messages as read from a specific user
router.patch('/:userId/read', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    // Mark all messages from otherUser to currentUser as read
    const result = await Message.updateMany(
      {
        messageType: 'direct',
        userId: otherUserId,
        recipientId: currentUserId,
        readBy: { $ne: currentUserId }
      },
      {
        $addToSet: { readBy: currentUserId }
      }
    );

    res.json({ 
      success: true, 
      markedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark messages as read' });
  }
});

// DELETE /api/direct-messages/:messageId - Delete a direct message (only sender can delete)
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const message = await Message.findOne({
      _id: messageId,
      messageType: 'direct',
      userId: req.user._id
    });

    if (!message) {
      return res.status(404).json({ 
        success: false, 
        error: 'Message not found or you are not authorized to delete it' 
      });
    }

    await Message.deleteOne({ _id: messageId });
    res.json({ success: true, deletedId: messageId });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

export default router;
