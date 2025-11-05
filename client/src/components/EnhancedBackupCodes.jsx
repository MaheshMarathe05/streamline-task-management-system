import React, { useState } from 'react';
// import { generateBackupCodes } from '../services/api'; // REMOVED - backup codes system replaced with OTP
import './EnhancedBackupCodes.css';

const EnhancedBackupCodes = ({ onCodesGenerated, onClose }) => {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [step, setStep] = useState('select'); // 'select', 'verify', 'success'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationData, setVerificationData] = useState({});
  const [newCodes, setNewCodes] = useState([]);
  const [emailCodeHash, setEmailCodeHash] = useState('');

  const methods = [
    {
      id: 'password_confirmation',
      title: 'Password Confirmation',
      description: 'Re-enter your current password to generate new backup codes',
      icon: '🔐',
      difficulty: 'Easy',
      timeRequired: '30 seconds'
    },
    {
      id: 'email_verification',
      title: 'Email Verification',
      description: 'Verify your identity via email verification code',
      icon: '📧',
      difficulty: 'Medium',
      timeRequired: '2-3 minutes'
    },
    {
      id: 'self_service',
      title: 'Multi-Factor Self-Service',
      description: 'Use password + email verification for enhanced security',
      icon: '🛡️',
      difficulty: 'Medium',
      timeRequired: '3-5 minutes',
      recommended: true
    },
    {
      id: 'progressive_verification',
      title: 'Progressive Verification',
      description: 'Multiple verification steps for maximum security',
      icon: '🎯',
      difficulty: 'Advanced',
      timeRequired: '5-10 minutes'
    }
  ];

  const handleMethodSelect = (methodId) => {
    setSelectedMethod(methodId);
    setStep('verify');
    setError('');
  };

  const requestEmailVerification = async () => {
    try {
      const response = await fetch('/api/enhanced-recovery/request-email-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setEmailCodeHash(result.codeHash);
        alert('Verification code sent to your email!');
      } else {
        setError(result.error || 'Failed to send verification code');
      }
    } catch (err) {
      setError('Network error sending verification code');
    }
  };

  const handleSelfServiceRegeneration = async () => {
    if (!verificationData.currentPassword || !verificationData.emailCode) {
      setError('Please provide both current password and email verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/enhanced-recovery/self-service-regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: verificationData.currentPassword,
          emailVerificationCode: verificationData.emailCode,
          emailCodeHash: emailCodeHash,
          confirmRegeneration: true
        })
      });

      const result = await response.json();

      if (result.success) {
        setNewCodes(result.codes);
        setStep('success');
        
        // Auto-download the codes
        const blob = new Blob([result.codes.join('\\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'new-backup-codes-enhanced.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        if (onCodesGenerated) {
          onCodesGenerated(result.codes);
        }
      } else {
        setError(result.error || 'Failed to regenerate backup codes');
      }
    } catch (err) {
      setError('Network error during regeneration');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordMethodGeneration = async () => {
    if (!verificationData.currentPassword) {
      setError('Current password is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/enhanced-recovery/generate-codes-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          method: 'password_confirmation',
          verificationData: {
            currentPassword: verificationData.currentPassword
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setNewCodes(result.codes);
        setStep('success');
        
        // Auto-download
        const blob = new Blob([result.codes.join('\\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'backup-codes-password-verified.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        if (onCodesGenerated) {
          onCodesGenerated(result.codes);
        }
      } else {
        setError(result.error || 'Password verification failed');
      }
    } catch (err) {
      setError('Network error during verification');
    } finally {
      setLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <div className="method-selection">
      <h3>Choose Backup Code Generation Method</h3>
      <p className="subtitle">Select how you'd like to verify your identity to generate new backup codes</p>
      
      <div className="methods-grid">
        {methods.map((method) => (
          <div 
            key={method.id} 
            className={`method-card ${method.recommended ? 'recommended' : ''}`}
            onClick={() => handleMethodSelect(method.id)}
          >
            {method.recommended && <div className="recommended-badge">Recommended</div>}
            <div className="method-icon">{method.icon}</div>
            <h4>{method.title}</h4>
            <p className="method-description">{method.description}</p>
            <div className="method-meta">
              <span className="difficulty">Difficulty: {method.difficulty}</span>
              <span className="time">Time: {method.timeRequired}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVerificationStep = () => {
    const method = methods.find(m => m.id === selectedMethod);
    
    return (
      <div className="verification-step">
        <div className="step-header">
          <button className="back-button" onClick={() => setStep('select')}>← Back</button>
          <h3>{method.icon} {method.title}</h3>
        </div>

        {selectedMethod === 'password_confirmation' && (
          <div className="verification-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                value={verificationData.currentPassword || ''}
                onChange={(e) => setVerificationData(prev => ({
                  ...prev,
                  currentPassword: e.target.value
                }))}
                placeholder="Enter your current password"
                required
              />
            </div>
            <button 
              className="verify-button"
              onClick={handlePasswordMethodGeneration}
              disabled={loading || !verificationData.currentPassword}
            >
              {loading ? 'Generating...' : 'Generate Backup Codes'}
            </button>
          </div>
        )}

        {selectedMethod === 'self_service' && (
          <div className="verification-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                value={verificationData.currentPassword || ''}
                onChange={(e) => setVerificationData(prev => ({
                  ...prev,
                  currentPassword: e.target.value
                }))}
                placeholder="Enter your current password"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="emailCode">Email Verification Code</label>
              <div className="email-verification">
                <input
                  type="text"
                  id="emailCode"
                  value={verificationData.emailCode || ''}
                  onChange={(e) => setVerificationData(prev => ({
                    ...prev,
                    emailCode: e.target.value
                  }))}
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                />
                <button 
                  type="button" 
                  className="send-code-button"
                  onClick={requestEmailVerification}
                >
                  Send Code
                </button>
              </div>
            </div>
            
            <button 
              className="verify-button"
              onClick={handleSelfServiceRegeneration}
              disabled={loading || !verificationData.currentPassword || !verificationData.emailCode}
            >
              {loading ? 'Generating...' : 'Generate Backup Codes'}
            </button>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>
    );
  };

  const renderSuccessStep = () => (
    <div className="success-step">
      <div className="success-header">
        <h3>✅ Backup Codes Generated Successfully!</h3>
        <p>Your new backup codes have been generated and downloaded automatically.</p>
      </div>

      <div className="codes-display">
        <h4>Your New Backup Codes</h4>
        <div className="codes-grid">
          {newCodes.map((code, index) => (
            <div key={index} className="code-item">
              {code}
            </div>
          ))}
        </div>
      </div>

      <div className="success-actions">
        <button className="primary-button" onClick={onClose}>
          Done
        </button>
        <button 
          className="secondary-button"
          onClick={() => {
            // Re-download codes
            const blob = new Blob([newCodes.join('\\n')], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'backup-codes-redownload.txt';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }}
        >
          Download Again
        </button>
      </div>

      <div className="important-notes">
        <h4>Important:</h4>
        <ul>
          <li>Your previous backup codes are now invalid</li>
          <li>Store these codes in a secure location</li>
          <li>Each code can only be used once</li>
          <li>You can generate new codes anytime using these methods</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="enhanced-backup-codes-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Enhanced Backup Code Generation</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {step === 'select' && renderMethodSelection()}
          {step === 'verify' && renderVerificationStep()}
          {step === 'success' && renderSuccessStep()}
        </div>
      </div>
    </div>
  );
};

export default EnhancedBackupCodes;