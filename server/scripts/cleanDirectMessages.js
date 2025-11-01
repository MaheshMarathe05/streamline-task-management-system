import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function cleanDirectMessages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Delete all direct messages
    const result = await mongoose.connection.db.collection('messages').deleteMany({ 
      messageType: 'direct' 
    });
    
    console.log(`🗑️  Deleted ${result.deletedCount} direct messages encrypted with old key`);
    console.log('✅ Users can now send new messages that will be properly encrypted');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanDirectMessages();
