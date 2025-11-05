import mongoose from 'mongoose';

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  userData: {
    name: String,
    password: String,
    role: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Document will be automatically deleted after 10 minutes
  }
});

const EmailVerification = mongoose.model('EmailVerification', emailVerificationSchema);

export default EmailVerification;
