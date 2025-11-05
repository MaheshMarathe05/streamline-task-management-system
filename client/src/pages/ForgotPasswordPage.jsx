import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestPasswordReset, resetPasswordWithOTP } from '../services/api';
import { validation, getPasswordStrength } from '../utils/validation';
import './ForgotPasswordPage.css';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: email, 2: OTP + password
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldTouched, setFieldTouched] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({ level: 0, text: '', color: '' });
  const [resendCooldown, setResendCooldown] = useState(0);

  // Start resend cooldown timer
  const startResendCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1: Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required.');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const data = await requestPasswordReset(email);
      
      if (data.success) {
        setCurrentStep(2);
        setMessage('Verification code sent to your email! Please check your inbox.');
        startResendCooldown();
      } else {
        setError(data.error || 'Failed to send verification code. Please try again.');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const data = await requestPasswordReset(email);
      
      if (data.success) {
        setMessage('New verification code sent! Please check your email.');
        startResendCooldown();
      } else {
        setError(data.error || 'Failed to resend code.');
      }
    } catch (error) {
      setError('Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password change with validation
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);
    setFieldTouched(prev => ({ ...prev, newPassword: true }));
    const errors = validation.password(value);
    setFieldErrors(prev => ({ ...prev, newPassword: errors }));
    setPasswordStrength(getPasswordStrength(value));
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setFieldTouched(prev => ({ ...prev, confirmPassword: true }));
    const errors = validation.confirmPassword(newPassword, value);
    setFieldErrors(prev => ({ ...prev, confirmPassword: errors }));
  };

  // Step 2: Reset password with OTP
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    // Mark fields as touched
    setFieldTouched({ newPassword: true, confirmPassword: true });
    
    // Validate passwords
    const passwordErrors = validation.password(newPassword);
    const confirmErrors = validation.confirmPassword(newPassword, confirmPassword);
    
    if (passwordErrors.length > 0 || confirmErrors.length > 0) {
      setFieldErrors({
        newPassword: passwordErrors,
        confirmPassword: confirmErrors
      });
      setError('Please fix the validation errors above.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await resetPasswordWithOTP(email, otp, newPassword);
      
      if (data.success) {
        setMessage('Password reset successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setError(data.error || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        {currentStep === 1 ? (
          <>
            <h2 className="forgot-password-title">Reset Your Password</h2>
            <p className="forgot-password-subtitle">
              Enter your email address and we'll send you a verification code.
            </p>

            <form onSubmit={handleRequestOTP} className="forgot-password-form">
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  required
                  autoFocus
                />
              </div>
              
              {error && <p className="error-message">{error}</p>}
              {message && <p className="success-message">{message}</p>}
              
              <button type="submit" className="verify-button" disabled={isLoading}>
                {isLoading ? <div className="spinner"></div> : 'Send Verification Code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="forgot-password-title">Enter Verification Code</h2>
            <p className="forgot-password-subtitle">
              We sent a 6-digit code to <strong>{email}</strong>
            </p>

            <form onSubmit={handlePasswordReset} className="forgot-password-form">
              <div className="input-group">
                <label htmlFor="otp">Verification Code</label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="otp-input"
                  maxLength="6"
                  required
                  autoFocus
                />
                <small className="form-hint">
                  Check your email for the 6-digit verification code
                </small>
              </div>

              <div className="input-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={handlePasswordChange}
                  onBlur={() => setFieldTouched(prev => ({ ...prev, newPassword: true }))}
                  placeholder="Enter new password"
                  className={fieldTouched.newPassword && fieldErrors.newPassword?.length > 0 ? 'error' : ''}
                  required
                />
                {fieldTouched.newPassword && fieldErrors.newPassword?.length > 0 && (
                  <div className="field-errors">
                    {fieldErrors.newPassword.map((error, index) => (
                      <span key={index} className="error-text">{error}</span>
                    ))}
                  </div>
                )}
                {newPassword && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div 
                        className={`strength-fill strength-${passwordStrength.level}`}
                        style={{ width: `${(passwordStrength.level / 4) * 100}%` }}
                      />
                    </div>
                    <span className={`strength-text strength-${passwordStrength.level}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                )}
                <small className="form-hint">
                  Password must be at least 8 characters with uppercase, lowercase, number, and special character.
                </small>
              </div>
              
              <div className="input-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  onBlur={() => setFieldTouched(prev => ({ ...prev, confirmPassword: true }))}
                  placeholder="Confirm new password"
                  className={fieldTouched.confirmPassword && fieldErrors.confirmPassword?.length > 0 ? 'error' : ''}
                  required
                />
                {fieldTouched.confirmPassword && fieldErrors.confirmPassword?.length > 0 && (
                  <div className="field-errors">
                    {fieldErrors.confirmPassword.map((error, index) => (
                      <span key={index} className="error-text">{error}</span>
                    ))}
                  </div>
                )}
              </div>
              
              {error && <p className="error-message">{error}</p>}
              {message && <p className="success-message">{message}</p>}
              
              <button type="submit" className="reset-button" disabled={isLoading}>
                {isLoading ? <div className="spinner"></div> : 'Reset Password'}
              </button>

              <div className="resend-container">
                <button
                  type="button"
                  className="resend-link"
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || isLoading}
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Resend verification code'}
                </button>
              </div>
              
              <button 
                type="button" 
                className="back-button" 
                onClick={() => {
                  setCurrentStep(1);
                  setOtp('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError('');
                  setMessage('');
                }}
              >
                ← Back
              </button>
            </form>
          </>
        )}

        <div className="back-to-login">
          <Link to="/" className="back-link">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
