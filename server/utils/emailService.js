import nodemailer from 'nodemailer';

// Create reusable transporter
let transporter = null;

function createTransporter() {
  if (transporter) return transporter;

  // Gmail SMTP configuration
  if (process.env.EMAIL_HOST_USER && process.env.EMAIL_HOST_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_HOST_USER,
        pass: process.env.EMAIL_HOST_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    console.log('✅ Email transporter configured with Gmail SMTP');
  } else {
    // Development mode - log to console instead
    console.warn('⚠️  Email credentials not configured. Emails will be logged to console.');
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix'
    });
  }

  return transporter;
}

// Generate 6-digit OTP
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification email
export async function sendVerificationEmail(email, otp, name) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Streamline Task Management" <${process.env.EMAIL_HOST_USER || 'noreply@streamline.com'}>`,
      to: email,
      subject: 'Verify Your Email - Streamline Task Management',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Welcome to Streamline!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Thank you for registering with Streamline Task Management System!</p>
              <p>To complete your registration, please verify your email address using the code below:</p>
              
              <div class="otp-box">
                <p style="margin: 0; color: #666;">Your Verification Code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 0; color: #666; font-size: 14px;">Valid for 10 minutes</p>
              </div>

              <div class="warning">
                <strong>⚠️ Security Note:</strong>
                <ul style="margin: 10px 0;">
                  <li>Never share this code with anyone</li>
                  <li>This code expires in 10 minutes</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>

              <p>If you have any questions, feel free to contact our support team.</p>
              <p>Best regards,<br><strong>Streamline Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Streamline Task Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // If using development mode (streamTransport), log the email
    if (!process.env.EMAIL_HOST_USER) {
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL VERIFICATION CODE (Development Mode)');
      console.log('='.repeat(60));
      console.log(`👤 Name:  ${name}`);
      console.log(`📨 Email: ${email}`);
      console.log(`🔑 OTP:   ${otp}`);
      console.log('⏰ Valid for: 10 minutes');
      console.log('='.repeat(60) + '\n');
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send verification email');
  }
}

// Send welcome email after successful verification
export async function sendWelcomeEmail(email, name) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Streamline Task Management" <${process.env.EMAIL_HOST_USER || 'noreply@streamline.com'}>`,
      to: email,
      subject: '✅ Welcome to Streamline - Your Account is Ready!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .feature-box { background: white; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome Aboard!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Your email has been successfully verified! Your account is now fully activated.</p>
              
              <div class="feature-box">
                <h3>🚀 What You Can Do Now:</h3>
                <ul>
                  <li>✅ Create and manage projects</li>
                  <li>✅ Assign tasks to team members</li>
                  <li>✅ Track progress with real-time updates</li>
                  <li>✅ Collaborate with encrypted messaging</li>
                  <li>✅ Monitor team performance</li>
                </ul>
              </div>

              <p>Ready to get started? <a href="http://localhost:5173/login" style="color: #667eea; text-decoration: none; font-weight: bold;">Log in to your account</a></p>

              <p>Best regards,<br><strong>Streamline Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Streamline Task Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);

    if (!process.env.EMAIL_HOST_USER) {
      console.log(`\n📧 WELCOME EMAIL sent to ${email} (Development Mode)\n`);
    }

    return { success: true };
  } catch (error) {
    console.error('Welcome email error:', error);
    // Don't throw - this is non-critical
    return { success: false };
  }
}
