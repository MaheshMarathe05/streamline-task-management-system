
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services/api';
import { validateRegistrationForm, validation, getPasswordStrength } from '../utils/validation';
import './RegisterPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Registration form, 2: OTP verification
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [selectedRole, setSelectedRole] = useState('employee');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldTouched, setFieldTouched] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({ level: 0, text: '', color: '' });
  const [resendCooldown, setResendCooldown] = useState(0);

  const { name, email, password, confirmPassword } = formData;

  // Real-time validation on field change
  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Mark field as touched
    setFieldTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate specific field
    let errors = [];
    switch (name) {
      case 'name':
        errors = validation.name(value);
        break;
      case 'email':
        errors = validation.email(value);
        break;
      case 'password':
        errors = validation.password(value);
        setPasswordStrength(getPasswordStrength(value));
        break;
      case 'confirmPassword':
        errors = validation.confirmPassword(formData.password, value);
        break;
      default:
        break;
    }
    
    setFieldErrors(prev => ({
      ...prev,
      [name]: errors
    }));
  };

  // Handle field blur for validation
  const onBlur = (e) => {
    const { name } = e.target;
    setFieldTouched(prev => ({ ...prev, [name]: true }));
  };

  // Handle role selection
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setFieldTouched(prev => ({ ...prev, role: true }));
    setFieldErrors(prev => ({
      ...prev,
      role: validation.role(role)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setFieldTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      role: true
    });
    
    // Validate entire form
    const validationResult = validateRegistrationForm({
      ...formData,
      role: selectedRole
    });
    
    if (!validationResult.isValid) {
      setFieldErrors(validationResult.errors);
      setError('Please fix the errors above before submitting.');
      return;
    }
    
    setError('');
    setIsLoading(true);

    try {
      const res = await registerUser({ name, email, password, role: selectedRole });

      if (res.success && res.requiresVerification) {
        // Move to OTP verification step
        setStep(2);
        setError('');
      } else if (res.success) {
        // Old flow - direct registration (backward compatibility)
        alert('Registration successful! Please login.');
        navigate('/');
      } else {
        setError(res.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();

      if (data.success) {
        alert('Email verified successfully! Your account has been created. Please login.');
        navigate('/');
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        alert('Verification code resent! Please check your email.');
        setResendCooldown(60); // 60 second cooldown
      } else {
        setError(data.error || 'Failed to resend code');
      }
    } catch (error) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  return (
    <div className="register-container">
      <div className="register-card">
        {step === 1 ? (
          <>
            <h2 className="register-title">Create your Account</h2>
            <p className="register-subtitle">Join our platform to manage your tasks.</p>

            <form onSubmit={handleSubmit} className="register-form">
              <div className="input-group">
                <label htmlFor="name">Full Name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  value={name} 
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder="Enter Your Name" 
                  className={fieldTouched.name && fieldErrors.name?.length > 0 ? 'error' : ''}
                  required 
                />
                {fieldTouched.name && fieldErrors.name?.length > 0 && (
                  <div className="field-errors">
                    {fieldErrors.name.map((error, index) => (
                      <span key={index} className="error-text">{error}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  value={email} 
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder="yourname@gmail.com" 
                  className={fieldTouched.email && fieldErrors.email?.length > 0 ? 'error' : ''}
                  required 
                />
                {fieldTouched.email && fieldErrors.email?.length > 0 && (
                  <div className="field-errors">
                    {fieldErrors.email.map((error, index) => (
                      <span key={index} className="error-text">{error}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  value={password} 
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder="Enter a strong password" 
                  className={fieldTouched.password && fieldErrors.password?.length > 0 ? 'error' : ''}
                  required 
                />
                {password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div 
                        className="strength-fill" 
                        style={{ 
                          width: `${(passwordStrength.level / 4) * 100}%`,
                          backgroundColor: passwordStrength.color 
                        }}
                      ></div>
                    </div>
                    <span className="strength-text" style={{ color: passwordStrength.color }}>
                      {passwordStrength.text}
                    </span>
                  </div>
                )}
                {fieldTouched.password && fieldErrors.password?.length > 0 && (
                  <div className="field-errors">
                    {fieldErrors.password.map((error, index) => (
                      <span key={index} className="error-text">{error}</span>
                    ))}
                  </div>
                )}
                <div className="password-requirements">
                  <small>Password must contain:</small>
                  <ul>
                    <li className={/[A-Z]/.test(password) ? 'valid' : ''}>One uppercase letter</li>
                    <li className={/[a-z]/.test(password) ? 'valid' : ''}>One lowercase letter</li>
                    <li className={/[0-9]/.test(password) ? 'valid' : ''}>One number</li>
                    <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'valid' : ''}>One special character</li>
                    <li className={password.length >= 8 ? 'valid' : ''}>At least 8 characters</li>
                  </ul>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  value={confirmPassword} 
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder="Re-enter your password" 
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

              <div className="input-group">
                <label>Select your Role</label>
                <div className="role-selector">
                  <button 
                    type="button" 
                    className={selectedRole === 'employee' ? 'active' : ''} 
                    onClick={() => handleRoleSelect('employee')}
                  >
                    Employee
                  </button>
                  <button 
                    type="button" 
                    className={selectedRole === 'manager' ? 'active' : ''} 
                    onClick={() => handleRoleSelect('manager')}
                  >
                    Manager
                  </button>
                </div>
                {fieldTouched.role && fieldErrors.role?.length > 0 && (
                  <div className="field-errors">
                    {fieldErrors.role.map((error, index) => (
                      <span key={index} className="error-text">{error}</span>
                    ))}
                  </div>
                )}
              </div>
              
              {error && <p className="error-message">{error}</p>}
              
              <button type="submit" className="register-button" disabled={isLoading}>
                {isLoading ? <div className="spinner"></div> : 'Create Account'}
              </button>
            </form>

            <p className="redirect-text">
              Already have an account?{' '}
              <Link to="/" className="redirect-link">
                Sign In
              </Link>
            </p>
          </>
        ) : (
          <>
            <h2 className="register-title">📧 Verify Your Email</h2>
            <p className="register-subtitle">
              We've sent a 6-digit verification code to<br/>
              <strong>{email}</strong>
            </p>

            <form onSubmit={handleVerifyOTP} className="register-form">
              <div className="input-group">
                <label htmlFor="otp">Verification Code</label>
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                  className="otp-input"
                  required
                  autoFocus
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                  Code expires in 10 minutes
                </p>
              </div>

              {error && <p className="error-message">{error}</p>}

              <button type="submit" className="register-button" disabled={isLoading}>
                {isLoading ? <div className="spinner"></div> : 'Verify Email'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Didn't receive the code?{' '}
                <button
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCooldown > 0 ? '#999' : '#667eea',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    textDecoration: 'underline',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </p>
              <p style={{ fontSize: '14px', marginTop: '10px' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#667eea',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '14px'
                  }}
                >
                  ← Change email address
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
