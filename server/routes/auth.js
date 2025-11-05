import express from "express";
import User from "../models/User.js";
import SecurityActivity from "../models/SecurityActivity.js";
import EmailVerification from "../models/EmailVerification.js";
import jwt from "jsonwebtoken";
import argon2 from "argon2"; // Argon2id for password verification (memory-hard, GPU-resistant, modern PHC winner)
import bcrypt from 'bcrypt';
import passport from "passport";
import { protect } from "../middleware/authMiddleware.js";
import SecurityLog from "../models/SecurityLog.js";
import { authenticator } from 'otplib';
import { generateOTP, sendVerificationEmail, sendWelcomeEmail } from "../utils/emailService.js";
import crypto from 'crypto';
import Notification from "../models/Notification.js";

// Helper function to generate backup codes
const generateBackupCodes = async () => {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    const randomBytes = crypto.randomBytes(4);
    const code = randomBytes.toString('hex').toUpperCase();
    const formattedCode = `${code.substring(0, 4)}-${code.substring(4, 8)}`;
    codes.push(formattedCode);
  }
  
  const hashedCodes = [];
  for (const code of codes) {
    const saltRounds = 12;
    const codeHash = await bcrypt.hash(code, saltRounds);
    hashedCodes.push({
      codeHash,
      isUsed: false
    });
  }
  
  return { plainCodes: codes, hashedCodes };
};

const router = express.Router();

// --- Local Registration ---
router.post("/register", async (req, res) => {
  // Now expecting 'role' from the frontend
  const { name, email, password, role } = req.body; 

  // Basic validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, error: "Please provide all required fields." });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: "Please provide a valid email address." });
  }

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, error: "User already exists with this email" });
    }

    // Generate OTP
    const otp = generateOTP();
    console.log(`🔐 Generated OTP for ${email}: ${otp}`);

    // Hash the password before storing temporarily
    const hashedPassword = await argon2.hash(password);

    // Delete any existing verification for this email
    await EmailVerification.deleteOne({ email });

    // Store verification data temporarily (expires in 10 minutes)
    const verification = new EmailVerification({
      email,
      otp,
      userData: {
        name,
        password: hashedPassword,
        role
      }
    });
    await verification.save();

    // Send verification email
    try {
      await sendVerificationEmail(email, otp, name);
      console.log(`✅ Verification email sent successfully to ${email}`);
      
      res.status(200).json({ 
        success: true, 
        message: "Verification code sent to your email. Please check your inbox.",
        requiresVerification: true
      });
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      // Delete the verification record if email fails
      await EmailVerification.deleteOne({ email });
      res.status(500).json({ 
        success: false, 
        error: "Failed to send verification email. Please try again or check your email address." 
      });
    }
  } catch (err) {
    console.error("Registration Error:", err.message);
    res.status(500).json({ success: false, error: "Server error during registration" });
  }
});

// New route: Verify email with OTP
router.post("/verify-email", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, error: "Email and OTP are required" });
  }

  try {
    // Find verification record
    const verification = await EmailVerification.findOne({ email });

    if (!verification) {
      return res.status(400).json({ 
        success: false, 
        error: "Verification code expired or invalid. Please register again." 
      });
    }

    // Verify OTP
    if (verification.otp !== otp.trim()) {
      return res.status(400).json({ success: false, error: "Invalid verification code" });
    }

    // Create the actual user account
    const user = new User({
      name: verification.userData.name,
      email: verification.email,
      password: verification.userData.password, // Already hashed
      role: verification.userData.role,
      emailVerified: true
    });
    await user.save();

    // Clear notifications for new user
    try {
      await Notification.deleteMany({ user: user._id });
      console.log(`✅ Cleared notifications for new user: ${email}`);
    } catch (notifError) {
      console.error('Error clearing notifications:', notifError);
    }

    // Log security event
    try { 
      await SecurityLog.create({ 
        user: user._id, 
        event: 'register', 
        ip: req.ip, 
        userAgent: req.headers['user-agent'] 
      }); 
    } catch {}

    // Delete verification record
    await EmailVerification.deleteOne({ email });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, user.name).catch(err => 
      console.error('Welcome email failed:', err)
    );

    res.status(201).json({ 
      success: true, 
      message: "Email verified successfully! Your account has been created. Please login.",
      emailVerified: true
    });
  } catch (err) {
    console.error("Email Verification Error:", err.message);
    res.status(500).json({ success: false, error: "Server error during verification" });
  }
});

// New route: Resend verification code
router.post("/resend-verification", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required" });
  }

  try {
    // Check if verification exists
    const verification = await EmailVerification.findOne({ email });

    if (!verification) {
      return res.status(400).json({ 
        success: false, 
        error: "No pending verification found. Please register again." 
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    verification.otp = otp;
    verification.createdAt = new Date(); // Reset expiry
    await verification.save();

    // Resend email
    await sendVerificationEmail(email, otp, verification.userData.name);

    res.status(200).json({ 
      success: true, 
      message: "Verification code resent successfully. Please check your email." 
    });
  } catch (err) {
    console.error("Resend Verification Error:", err.message);
    res.status(500).json({ success: false, error: "Failed to resend verification code" });
  }
});

// --- Local Login ---
router.post("/login", async (req, res) => {
  let { email, password } = req.body || {};
  if (typeof email === 'string') email = email.trim().toLowerCase();
  
  if (!email || !password) {
      return res.status(400).json({ success: false, error: "Please provide email and password." });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ success: false, error: "Invalid credentials" });
    }

    try {
      const ok = await argon2.verify(user.password, password);
      if (!ok) {
        return res.status(400).json({ success: false, error: "Invalid credentials" });
      }
    } catch (verifyErr) {
      console.error('Password verification error (argon2):', verifyErr.message);
      return res.status(500).json({ success: false, error: "Server error during password verification" });
    }

    // Direct login - no backup code required
    const securityActivity = new SecurityActivity({
      userId: user._id,
      loginTime: new Date()
    });
    await securityActivity.save();

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
      activityId: securityActivity._id
    };

    try {
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      SecurityLog.create({ 
        user: user._id, 
        event: 'login_success', 
        ip: req.ip, 
        userAgent: req.headers['user-agent'] 
      }).catch(() => {});
      
      return res.json({
        success: true,
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    } catch(tokenErr) {
      console.error('JWT sign error:', tokenErr);
      return res.status(500).json({ success: false, error: 'Auth token generation failed' });
    }
  } catch (err) {
    console.error("Login Error:", err.message);
    try { await SecurityLog.create({ user: undefined, event: 'login_error', ip: req.ip, userAgent: req.headers['user-agent'], success: false, metadata: { email } }); } catch {}
    res.status(500).json({ success: false, error: "Server error during login" });
  }
});

// --- Verify backup code to complete login (Step 2) ---
router.post('/verify-backup-code', async (req, res) => {
  const { tempToken, backupCode } = req.body;
  
  if (!tempToken || !backupCode) {
    return res.status(400).json({ 
      success: false, 
      error: 'Temporary token and backup code are required' 
    });
  }
  
  try {
    // Verify the temporary token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    
    if (decoded.step !== 'password-verified') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid temporary token' 
      });
    }
    
    // Find the user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Check if user has backup codes
    if (!user.twoFactor?.backupCodes || user.twoFactor.backupCodes.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No backup codes found. Please use account recovery.', 
        requiresRecovery: true
      });
    }
    
    // Check for available (unused) backup codes
    const availableCodes = user.twoFactor.backupCodes.filter(code => !code.isUsed);
    if (availableCodes.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'All backup codes have been used. Please use account recovery.', 
        requiresRecovery: true,
        allCodesExhausted: true
      });
    }
    
    // Find a matching unused backup code
    let matchedCodeIndex = -1;
    for (let i = 0; i < user.twoFactor.backupCodes.length; i++) {
      const codeObj = user.twoFactor.backupCodes[i];
      if (!codeObj.isUsed) {
        const isMatch = await bcrypt.compare(backupCode, codeObj.codeHash);
        if (isMatch) {
          matchedCodeIndex = i;
          break;
        }
      }
    }
    
    if (matchedCodeIndex === -1) {
      SecurityLog.create({ 
        user: user._id, 
        event: 'login_backup_code_failed', 
        ip: req.ip, 
        userAgent: req.headers['user-agent'] 
      }).catch(()=>{});
      
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or already used backup code' 
      });
    }
    
    // Mark the code as used
    user.twoFactor.backupCodes[matchedCodeIndex].isUsed = true;
    await user.save();
    
    // Record login in security activity
    const securityActivity = new SecurityActivity({
      userId: user._id,
      loginTime: new Date()
    });
    await securityActivity.save();
    
    // Generate final JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
      activityId: securityActivity._id // Store activity ID for logout tracking
    };
    
    // Check remaining backup codes and warn if low
    const remainingCodes = user.twoFactor.backupCodes.filter(code => !code.isUsed).length;
    const isLowOnCodes = remainingCodes <= 2;
    
    try {
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      SecurityLog.create({ 
        user: user._id, 
        event: 'login_success', 
        ip: req.ip, 
        userAgent: req.headers['user-agent'] 
      }).catch(() => {});
      
      return res.json({
        success: true,
        token,
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role 
        },
        activityId: securityActivity._id,
        backupCodesRemaining: remainingCodes,
        lowOnBackupCodes: isLowOnCodes,
        warning: isLowOnCodes ? `Warning: Only ${remainingCodes} backup codes remaining. Generate new codes soon.` : null
      });
    } catch(tokenErr) {
      console.error('JWT sign error:', tokenErr);
      return res.status(500).json({ 
        success: false, 
        error: 'Auth token generation failed' 
      });
    }
    
  } catch (err) {
    console.error('Backup code verification error:', err);
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid or expired temporary token' 
    });
  }
});

// --- Logout endpoint ---
router.post('/logout', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const activityId = req.user.activityId; // Get from JWT payload if available
    
    // Find the most recent activity record without logout time
    let activityQuery = { userId, logoutTime: null };
    if (activityId) {
      activityQuery._id = activityId;
    }
    
    const activity = await SecurityActivity.findOne(activityQuery).sort({ loginTime: -1 });
    
    if (activity) {
      const logoutTime = new Date();
      const loginTime = activity.loginTime;
      
      // Calculate duration
      const durationMs = logoutTime - loginTime;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
      
      let durationStr = '';
      if (hours > 0) durationStr += `${hours}h `;
      if (minutes > 0) durationStr += `${minutes}m `;
      durationStr += `${seconds}s`;
      
      // Update the activity record
      activity.logoutTime = logoutTime;
      activity.duration = durationStr.trim();
      await activity.save();
    }
    
    SecurityLog.create({ 
      user: userId, 
      event: 'logout', 
      ip: req.ip, 
      userAgent: req.headers['user-agent'] 
    }).catch(() => {});
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Logout failed' 
    });
  }
});

// --- Forgot Password ---
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, error: "Please provide an email address." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, we don't reveal if the email exists or not
      return res.json({ 
        success: true, 
        message: "If an account with this email exists, password reset instructions have been sent." 
      });
    }

    // In a real application, you would:
    // 1. Generate a secure reset token
    // 2. Store it in the database with expiration
    // 3. Send an email with reset link
    // 
    // For now, we'll simulate the process
    console.log(`Password reset requested for: ${email}`);
    console.log(`User found: ${user.name} (${user.email})`);
    console.log('In a real app, an email would be sent with reset instructions.');
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({ 
      success: true, 
      message: "Password reset instructions have been sent to your email address." 
    });
  } catch (err) {
    console.error("Forgot Password Error:", err.message);
    res.status(500).json({ success: false, error: "Server error. Please try again later." });
  }
});

// --- Reset Password (authenticated) ---
router.post("/reset-password", protect, async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, error: "All fields are required." });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, error: "New passwords do not match." });
  }
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.password) {
      return res.status(400).json({ success: false, error: "Invalid request." });
    }
    const ok = await argon2.verify(user.password, oldPassword);
    if (!ok) {
      return res.status(400).json({ success: false, error: "Old password is incorrect." });
    }
    user.password = newPassword; // will be hashed by pre-save hook
    await user.save();
    try { await SecurityLog.create({ user: user._id, event: 'password_reset', ip: req.ip, userAgent: req.headers['user-agent'] }); } catch {}
    return res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("Reset Password Error:", err.message);
    res.status(500).json({ success: false, error: "Server error during password reset." });
  }
});



// --- Regenerate backup codes with backup code verification ---
router.post('/regenerate-backup-codes-with-code', async (req, res) => {
  try {
    const { email, backupCode } = req.body;

    if (!email || !backupCode) {
      return res.status(400).json({
        success: false,
        error: 'Email and backup code are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this email address'
      });
    }

    // Check if user has backup codes
    if (!user.twoFactor?.backupCodes || user.twoFactor.backupCodes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No backup codes found for this account'
      });
    }

    // Verify the provided backup code
    let matchedCodeIndex = -1;
    for (let i = 0; i < user.twoFactor.backupCodes.length; i++) {
      const codeObj = user.twoFactor.backupCodes[i];
      if (!codeObj.isUsed) {
        const isMatch = await bcrypt.compare(backupCode, codeObj.codeHash);
        if (isMatch) {
          matchedCodeIndex = i;
          break;
        }
      }
    }

    if (matchedCodeIndex === -1) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or already used backup code'
      });
    }

    // Generate new backup codes
    const { plainCodes, hashedCodes } = await generateBackupCodes();

    // Update user with new backup codes and mark used code
    user.twoFactor.backupCodes[matchedCodeIndex].isUsed = true;
    user.twoFactor.backupCodes = hashedCodes;
    await user.save();

    // Log the backup code regeneration
    SecurityLog.create({ 
      user: user._id, 
      event: 'backup_codes_regenerated_with_code', 
      ip: req.ip, 
      userAgent: req.headers['user-agent'] 
    }).catch(() => {});

    console.log(`✅ Backup codes regenerated using backup code for user: ${email}`);

    res.status(200).json({
      success: true,
      message: 'New backup codes generated successfully',
      backupCodes: plainCodes
    });

  } catch (error) {
    console.error('Error regenerating backup codes with code:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// --- Regenerate backup codes with password confirmation ---
router.post('/regenerate-backup-codes', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this email address'
      });
    }

    // Verify password using argon2 (same as login)
    try {
      const isValidPassword = await argon2.verify(user.password, password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password'
        });
      }
    } catch (verifyErr) {
      console.error('Password verification error:', verifyErr.message);
      return res.status(500).json({
        success: false,
        error: 'Server error during password verification'
      });
    }

    // Generate new backup codes
    const { plainCodes, hashedCodes } = await generateBackupCodes();

    // Update user with new backup codes and invalidate old ones
    user.twoFactor = user.twoFactor || {};
    user.twoFactor.backupCodes = hashedCodes;
    await user.save();

    // Log the backup code regeneration
    SecurityLog.create({ 
      user: user._id, 
      event: 'backup_codes_regenerated', 
      ip: req.ip, 
      userAgent: req.headers['user-agent'] 
    }).catch(() => {});

    console.log(`✅ Backup codes regenerated for user: ${email}`);

    res.status(200).json({
      success: true,
      message: 'New backup codes generated successfully',
      backupCodes: plainCodes
    });

  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// --- Google OAuth Routes ---
// This route starts the Google authentication process
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// This is the callback URL that Google will redirect to after user consent
router.get(
  "/google/callback",
  passport.authenticate("google", { 
    failureRedirect: "http://localhost:5173/login", // Redirect to frontend login on failure
    session: false // We are using JWT, not sessions
  }),
  (req, res) => {
    // On successful authentication, req.user is available.
    // We sign a JWT for this user.
    const payload = {
        user: {
            id: req.user.id,
            role: req.user.role,
        }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
    
    // Redirect back to the frontend with the token and user info
    const user = JSON.stringify({
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
    });
    
    // A common practice is to pass the token as a query parameter or use a dedicated page to handle it
    res.redirect(`http://localhost:5173/dashboard?token=${token}&user=${encodeURIComponent(user)}`);
  }
);

// --- Generate backup codes after registration ---
router.post('/generate-backup-codes', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email and password are required' 
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Verify password
    const passwordValid = await argon2.verify(user.password, password);
    if (!passwordValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid password' 
      });
    }

    // Generate backup codes
    const { plainCodes, hashedCodes } = await generateBackupCodes();

    // Save to user
    user.twoFactor = {
      backupCodes: hashedCodes
    };
    await user.save();

    res.json({ 
      success: true, 
      backupCodes: plainCodes 
    });
  } catch (error) {
    console.error('Generate backup codes error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate backup codes' 
    });
  }
});

// --- Verify backup code for password reset ---
router.post('/verify-backup-code-for-reset', async (req, res) => {
  const { email, backupCode } = req.body;
  
  if (!email || !backupCode) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email and backup code are required' 
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (!user.twoFactor?.backupCodes || user.twoFactor.backupCodes.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No backup codes available for this account' 
      });
    }

    // Check if backup code is valid
    let validCodeFound = false;
    for (const codeObj of user.twoFactor.backupCodes) {
      if (!codeObj.isUsed) {
        const isValid = await bcrypt.compare(backupCode, codeObj.codeHash);
        if (isValid) {
          validCodeFound = true;
          break;
        }
      }
    }

    if (!validCodeFound) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid backup code' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Backup code verified. You can now reset your password.' 
    });
  } catch (error) {
    console.error('Verify backup code error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify backup code' 
    });
  }
});

// --- Reset password with backup code ---
router.post('/reset-password-with-backup', async (req, res) => {
  const { email, backupCode, newPassword } = req.body;
  
  if (!email || !backupCode || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email, backup code, and new password are required' 
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ 
      success: false, 
      error: 'Password must be at least 6 characters long' 
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (!user.twoFactor?.backupCodes || user.twoFactor.backupCodes.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No backup codes available for this account' 
      });
    }

    // Find and mark the backup code as used
    let validCodeIndex = -1;
    for (let i = 0; i < user.twoFactor.backupCodes.length; i++) {
      const codeObj = user.twoFactor.backupCodes[i];
      if (!codeObj.isUsed) {
        const isValid = await bcrypt.compare(backupCode, codeObj.codeHash);
        if (isValid) {
          validCodeIndex = i;
          break;
        }
      }
    }

    if (validCodeIndex === -1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or already used backup code' 
      });
    }

    // Mark backup code as used
    user.twoFactor.backupCodes[validCodeIndex].isUsed = true;

    // Hash and save new password
    user.password = await argon2.hash(newPassword);
    await user.save();

    // Log security activity
    SecurityLog.create({ 
      user: user._id, 
      event: 'password_reset_with_backup', 
      ip: req.ip, 
      userAgent: req.headers['user-agent'] 
    }).catch(() => {});

    res.json({ 
      success: true, 
      message: 'Password reset successful' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset password' 
    });
  }
});

export default router;
