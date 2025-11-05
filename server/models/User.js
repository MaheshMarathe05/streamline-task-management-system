import mongoose from "mongoose";
import argon2 from "argon2"; // Using Argon2id for password hashing

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true
  },
  password: { 
    type: String,
    // Password is not required for users signing up via Google
    required: function() { return this.provider !== 'google'; }
  },
  role: { 
    type: String, 
    enum: ["employee", "manager"], 
    required: true 
  },
  provider: {
    type: String,
    default: 'local'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  twoFactor: {
    enabled: { type: Boolean, default: false },
    method: { type: String, enum: ['totp', 'sms'], default: 'totp' },
    totpSecret: { type: String }, // store encrypted
    phone: { type: String }, // for SMS
    // Single-use backup codes for MFA: store as hashes with usage tracking
    backupCodes: [{ 
      codeHash: String,
      isUsed: { type: Boolean, default: false }
    }],
    trustedDevices: [{ tokenHash: String, deviceName: String, lastUsedAt: Date, createdAt: { type: Date, default: Date.now } }],
  }
});

// Hash password with Argon2 before saving (only if modified or new)
// Argon2id chosen over bcrypt for improved resistance to GPU cracking and side-channel attacks.
// The argon2 library automatically encodes parameters (memoryCost, timeCost, parallelism) into the hash string.
UserSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password") || !this.password) {
      return next();
    }
    // Prevent double-hashing: if the password already looks like an Argon2 hash, skip.
    if (typeof this.password === 'string' && this.password.startsWith('$argon2')) {
      return next();
    }
    // Use secure defaults; you can tune memoryCost/timeCost via env if needed.
    this.password = await argon2.hash(this.password, {
      type: argon2.argon2id
      // Example for customization:
      // memoryCost: 2 ** 16, // 64 MB
      // timeCost: 3,
      // parallelism: 1
    });
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("User", UserSchema);
