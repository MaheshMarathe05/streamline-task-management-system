import React, { useEffect, useState } from 'react';
import './SettingsPage.css';
import api from '../services/api';
import { validation, getPasswordStrength } from '../utils/validation';

const sections = [
  { key: 'account', label: 'Account' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'security', label: 'Security' },
];

function setThemeMode(mode) {
  const root = document.documentElement;
  if (mode === 'light') {
    root.setAttribute('data-theme', 'light');
  } else if (mode === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else if (mode === 'system') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    if (mql.matches) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
    }
  }
  localStorage.setItem('themeMode', mode);
}

const AccountSection = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [strength, setStrength] = useState({ level: 0, text: '', color: '' });
  const [mfa, setMfa] = useState({ enabled: false, otpauth: '', secret: '', code: '', codes: [] });

  // Minimal fetch to get 2FA state (not backed by a dedicated endpoint; we infer from setup calls)
  // For a robust approach, add GET /api/2fa/status to return { enabled }

  useEffect(() => {
    setStrength(getPasswordStrength(newPassword));
  }, [newPassword]);

  const validateFields = () => {
    const errs = {
      newPassword: validation.password(newPassword),
      confirmPassword: validation.confirmPassword(newPassword, confirmPassword),
    };
    // drop empties
    Object.keys(errs).forEach(k => { if (!errs[k]?.length) delete errs[k]; });
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTouched({ oldPassword: true, newPassword: true, confirmPassword: true });
    if (!oldPassword) {
      setError('All fields are required.');
      return;
    }
    if (!validateFields()) {
      setError('Please fix the errors above.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/auth/reset-password', { oldPassword, newPassword, confirmPassword });
      if (res.data?.success) {
        setSuccess('Password updated successfully.');
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        setFieldErrors({}); setTouched({}); setStrength({ level: 0, text: '', color: '' });
      } else {
        setError(res.data?.error || 'Failed to reset password.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="settings-title">Account</h2>
      <form className="settings-form" onSubmit={onSubmit}>
        <label>
          Old Password
          <input
            type="password"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, oldPassword: true }))}
            required
          />
        </label>
        <label>
          New Password
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, newPassword: true }))}
            required
          />
          {newPassword && (
            <div className="password-strength">
              <div className="strength-bar"><div className="strength-fill" style={{ width: `${(strength.level / 4) * 100}%`, backgroundColor: strength.color }} /></div>
              <span className="strength-text" style={{ color: strength.color }}>{strength.text}</span>
            </div>
          )}
          {touched.newPassword && fieldErrors.newPassword?.length > 0 && (
            <div className="field-errors">
              {fieldErrors.newPassword.map((err, idx) => (<span key={idx} className="error-text">{err}</span>))}
            </div>
          )}
          <div className="password-requirements">
            <small>Password must contain:</small>
            <ul>
              <li className={/[A-Z]/.test(newPassword) ? 'valid' : ''}>One uppercase letter</li>
              <li className={/[a-z]/.test(newPassword) ? 'valid' : ''}>One lowercase letter</li>
              <li className={/[0-9]/.test(newPassword) ? 'valid' : ''}>One number</li>
              <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? 'valid' : ''}>One special character</li>
              <li className={newPassword.length >= 8 ? 'valid' : ''}>At least 8 characters</li>
            </ul>
          </div>
        </label>
        <label>
          Confirm New Password
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, confirmPassword: true }))}
            required
          />
          {touched.confirmPassword && fieldErrors.confirmPassword?.length > 0 && (
            <div className="field-errors">
              {fieldErrors.confirmPassword.map((err, idx) => (<span key={idx} className="error-text">{err}</span>))}
            </div>
          )}
        </label>
        {error && <div className="settings-error">{error}</div>}
        {success && <div className="settings-success">{success}</div>}
        <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? 'Updating...' : 'Reset Password'}</button>
      </form>
    </div>
  );
};

const AppearanceSection = () => {
  const [mode, setMode] = useState(localStorage.getItem('themeMode') || 'dark');

  useEffect(() => {
    setThemeMode(mode);
    let mql;
    const onChange = (e) => {
      if (mode === 'system') {
        const root = document.documentElement;
        if (e.matches) {
          root.removeAttribute('data-theme');
        } else {
          root.setAttribute('data-theme', 'light');
        }
      }
    };
    if (mode === 'system') {
      mql = window.matchMedia('(prefers-color-scheme: dark)');
      // modern browsers
      if (mql.addEventListener) mql.addEventListener('change', onChange);
      else if (mql.addListener) mql.addListener(onChange);
    }
    return () => {
      if (mql) {
        if (mql.removeEventListener) mql.removeEventListener('change', onChange);
        else if (mql.removeListener) mql.removeListener(onChange);
      }
    };
  }, [mode]);

  return (
    <div>
      <h2 className="settings-title">Appearance</h2>
      <div className="theme-toggle" role="radiogroup" aria-label="Theme mode">
        <label className={`toggle-option ${mode === 'dark' ? 'active' : ''}`}>
          <input type="radio" name="theme-mode" value="dark" checked={mode === 'dark'} onChange={() => setMode('dark')} />
          Dark
        </label>
        <label className={`toggle-option ${mode === 'light' ? 'active' : ''}`}>
          <input type="radio" name="theme-mode" value="light" checked={mode === 'light'} onChange={() => setMode('light')} />
          Light
        </label>
        <label className={`toggle-option ${mode === 'system' ? 'active' : ''}`}>
          <input type="radio" name="theme-mode" value="system" checked={mode === 'system'} onChange={() => setMode('system')} />
          System
        </label>
      </div>
      <p className="muted-hint">Theme follows your OS when set to System, and updates automatically.</p>
    </div>
  );
};

export default function SettingsPage() {
  const [active, setActive] = useState('account');
  
  useEffect(() => {
    // Apply saved theme mode on load (default dark). If system, apply current OS preference.
    const saved = localStorage.getItem('themeMode') || 'dark';
    setThemeMode(saved);
    
    // Check URL parameters for auto-focus
    const urlParams = new URLSearchParams(window.location.search);
    const focusSection = urlParams.get('focus');
    if (focusSection === 'backup-codes' || focusSection === 'security') {
      setActive('security');
    }
    
    // Clear URL parameters after processing
    if (focusSection) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  return (
    <div className="settings-page">
      <div className="settings-sidebar">
        {sections.map(s => (
          <button key={s.key} className={`settings-tab ${active === s.key ? 'active' : ''}`} onClick={() => setActive(s.key)}>{s.label}</button>
        ))}
      </div>
      <div className="settings-content">
        {active === 'account' && <AccountSection />}
        {active === 'appearance' && <AppearanceSection />}
        {active === 'security' && <SecuritySection />}
      </div>
    </div>
  );
}
function SecuritySection() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGracePeriodUser, setIsGracePeriodUser] = useState(false);
  const [isEmergencyUser, setIsEmergencyUser] = useState(false);

  useEffect(() => {
    // Check if user was redirected from grace period login
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('focus') === 'backup-codes') {
      setIsGracePeriodUser(true);
    }
    if (urlParams.get('emergency') === 'true') {
      setIsEmergencyUser(true);
    }

    const loadSecurityActivity = async () => {
      try {
        const { getSecurityActivity } = await import('../services/api');
        const res = await getSecurityActivity();
        if (res.data?.success) {
          setActivities(res.data.activities);
        } else {
          setError('Failed to load security activity');
        }
      } catch (err) {
        setError('Network error loading security activity');
      } finally {
        setLoading(false);
      }
    };

    loadSecurityActivity();
  }, []);

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      <h2 className="settings-title">Security Activity</h2>
      <p className="muted-hint">View your recent login and logout activity.</p>
      
      {isGracePeriodUser && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: '#fca5a5'
        }}>
          <strong>⚠️ Security Notice:</strong> You're currently in a 24-hour grace period. 
          Please generate backup codes below to secure your account.
        </div>
      )}
      
      {isEmergencyUser && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: '#fbbf24'
        }}>
          <strong>🚨 Emergency Access:</strong> You're using emergency access with limited time remaining. 
          Please generate new backup codes immediately to restore full account security.
        </div>
      )}
      
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="settings-error">{error}</div>
      ) : (
        <div className="security-activity-table">
          {activities.length === 0 ? (
            <p className="muted-hint">No security activity found.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text)' }}>Login Time</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text)' }}>Logout Time</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text)' }}>Session Duration</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px', color: 'var(--text)' }}>
                      {formatDateTime(activity.loginTime)}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text)' }}>
                      {activity.logoutTime ? formatDateTime(activity.logoutTime) : 
                        <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Active Session</span>
                      }
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text)' }}>
                      {activity.duration || 
                        <span style={{ color: 'var(--muted)' }}>Ongoing</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    channels: { inApp: true, email: false, push: false },
    frequency: 'instant',
    categories: { mentions: true, taskStatus: true, deadlines: true, team: false, project: false }
  });

  useEffect(() => {
    let mounted = true;
    import('../services/api').then(({ getNotificationPreferences }) => getNotificationPreferences())
      .then((res) => {
        if (!mounted) return;
        if (res.data?.success && res.data.preference) setForm(res.data.preference);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const update = (path, value) => {
    setForm(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = copy; for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value; return copy;
    });
  };

  const onSave = async () => {
    setSaving(true);
    const { updateNotificationPreferences } = await import('../services/api');
    const res = await updateNotificationPreferences(form);
    setSaving(false);
    if (!(res.data?.success)) alert('Failed to save');
  };

  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <h2 className="settings-title">Notifications</h2>
      <div className="settings-form">
        <div>
          <strong className="settings-title">Channels</strong>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {['inApp','email','push'].map(k => (
              <label key={k} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="checkbox" checked={!!form.channels?.[k]} onChange={e => update(`channels.${k}`, e.target.checked)} /> {k}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <strong className="settings-title" style={{ marginRight: 4 }}>Frequency</strong>
          <div className="theme-toggle" role="radiogroup">
            {['instant','hourly','daily'].map(f => (
              <label key={f} className={`toggle-option ${form.frequency===f?'active':''}`}>
                <input type="radio" name="freq" checked={form.frequency===f} onChange={() => update('frequency', f)} />
                {f}
              </label>
            ))}
          </div>
        </div>
        <div>
          <strong className="settings-title">Categories</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 8 }}>
            {['mentions','taskStatus','deadlines','team','project'].map(k => (
              <label key={k} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="checkbox" checked={!!form.categories?.[k]} onChange={e => update(`categories.${k}`, e.target.checked)} /> {k}
              </label>
            ))}
          </div>
        </div>
        <div>
          <button className="btn-primary" onClick={onSave} disabled={saving}>{saving?'Saving...':'Save Preferences'}</button>
        </div>
      </div>
    </div>
  );
}

// BackupCodesPanel removed - backup codes system has been replaced with OTP-based authentication
function BackupCodesPanel() {
  return (
    <div>
      <div style={{ color:'var(--muted)', marginBottom: 8 }}>
        Backup codes have been removed. Password reset now uses email OTP verification.
      </div>
    </div>
  );
}
