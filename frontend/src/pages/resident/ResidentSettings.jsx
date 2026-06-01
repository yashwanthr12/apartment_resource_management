/**
 * ResidentSettings.jsx
 * --------------------
 * Resident Settings page featuring:
 * 1. Change Email Address wizard (5 steps)
 * 2. Change Password wizard (4 steps)
 * 3. Disable Account flow
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiPost } from '../../services/api';
import { Alert, InlineSpinner, GlassCard } from '../../components/ui';
import AppNavbar from '../../components/layout/AppNavbar';

export default function ResidentSettings() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [globalAlert, setGlobalAlert] = useState(null);

  const [timer, setTimer] = useState(300);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setTimerActive(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive, timer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    document.title = 'Settings | ApartEase';
  }, []);


  const handleBack = (e) => {
    e.preventDefault();
    try {
      sessionStorage.setItem('profile-dropdown-open', 'true');
    } catch { /* noop */ }
    navigate(-1);
  };

  // ── 1. CHANGE EMAIL STATE ──
  const [emailStep, setEmailStep] = useState(0); // 0 = inactive, 1 = verify current, 2 = enter new, 3 = verify new, 4 = password confirmation
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentCode: '', newCode: '', password: '' });
  const [emailAlert, setEmailAlert] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // ── 2. CHANGE PASSWORD STATE ──
  const [pwdStep, setPwdStep] = useState(0); // 0 = inactive, 1 = verify current, 2 = enter new password, 3 = save
  const [pwdForm, setPwdForm] = useState({ currentCode: '', newPassword: '', confirmPassword: '' });
  const [pwdAlert, setPwdAlert] = useState(null);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // ── 3. DISABLE ACCOUNT STATE ──
  const [disableStep, setDisableStep] = useState(0); // 0 = inactive, 1 = confirmation, 2 = verify code
  const [disableCode, setDisableCode] = useState('');
  const [disableAlert, setDisableAlert] = useState(null);
  const [disableLoading, setDisableLoading] = useState(false);

  // ── 1. CHANGE EMAIL HANDLERS ──
  const handleStartEmailChange = () => {
    // Collapse & reset Change Password and Disable Account sections
    setPwdStep(0);
    setPwdAlert(null);
    setPwdForm({ currentCode: '', newPassword: '', confirmPassword: '' });
    setDisableStep(0);
    setDisableAlert(null);
    setDisableCode('');

    setEmailStep(1);
    setEmailForm({ newEmail: '', currentCode: '', newCode: '', password: '' });
    setEmailAlert({ message: 'A verification code was sent to your current email. Enter code.', type: 'info' });

    apiPost('/api/auth/send-otp', {
      email: user.email,
      purpose: 'change-email-current'
    }).then(({ ok, data }) => {
      if (ok) {
        setTimer(300);
        setTimerActive(true);
      } else {
        setEmailAlert({ message: data.error || 'Failed to send verification code.', type: 'danger' });
      }
    });
  };

  const handleVerifyCurrentEmail = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailAlert(null);
    const { ok, data } = await apiPost('/api/auth/verify-otp', {
      email: user.email,
      otp: emailForm.currentCode,
      purpose: 'change-email-current'
    });
    setEmailLoading(false);
    if (ok) {
      setEmailAlert(null);
      setEmailStep(2);
      setTimerActive(false);
    } else {
      setEmailAlert({ message: data.error || 'Invalid verification code.', type: 'danger' });
    }
  };

  const handleNewEmailSubmit = async (e) => {
    e.preventDefault();
    if (!emailForm.newEmail.trim() || !emailForm.newEmail.includes('@')) {
      setEmailAlert({ message: 'Please enter a valid new email address.', type: 'warning' });
      return;
    }
    setEmailLoading(true);
    setEmailAlert(null);
    const { ok, data } = await apiPost('/api/auth/send-otp', {
      email: emailForm.newEmail,
      purpose: 'change-email-new'
    });
    setEmailLoading(false);
    if (ok) {
      setEmailAlert({ message: 'Verification code was sent to your new email. Enter code.', type: 'info' });
      setEmailStep(3);
      setTimer(300);
      setTimerActive(true);
    } else {
      setEmailAlert({ message: data.error || 'Failed to send verification code.', type: 'danger' });
    }
  };

  const handleVerifyNewEmail = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailAlert(null);
    const { ok, data } = await apiPost('/api/auth/verify-otp', {
      email: emailForm.newEmail,
      otp: emailForm.newCode,
      purpose: 'change-email-new'
    });
    setEmailLoading(false);
    if (ok) {
      setEmailAlert(null);
      setEmailStep(4);
      setTimerActive(false);
    } else {
      setEmailAlert({ message: data.error || 'Invalid verification code.', type: 'danger' });
    }
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailAlert(null);

    const { ok, data } = await apiPost('/api/auth/change-email', {
      current_email: user.email,
      new_email: emailForm.newEmail,
      password: emailForm.password
    });

    if (ok) {
      setGlobalAlert({ message: 'Email address updated successfully.', type: 'success' });
      login({ ...user, ...data.user });
      setEmailStep(0);
    } else {
      setEmailAlert({ message: data.error || 'Failed to update email address.', type: 'danger' });
    }
    setEmailLoading(false);
  };

  // ── 2. CHANGE PASSWORD HANDLERS ──
  const handleStartPasswordChange = () => {
    // Collapse & reset Change Email and Disable Account sections
    setEmailStep(0);
    setEmailAlert(null);
    setEmailForm({ newEmail: '', currentCode: '', newCode: '', password: '' });
    setDisableStep(0);
    setDisableAlert(null);
    setDisableCode('');

    setPwdStep(1);
    setPwdForm({ currentCode: '', newPassword: '', confirmPassword: '' });
    setPwdAlert({ message: 'A verification code was sent to your email. Enter code.', type: 'info' });

    apiPost('/api/auth/send-otp', {
      email: user.email,
      purpose: 'change-password'
    }).then(({ ok, data }) => {
      if (ok) {
        setTimer(300);
        setTimerActive(true);
      } else {
        setPwdAlert({ message: data.error || 'Failed to send verification code.', type: 'danger' });
      }
    });
  };

  const handleVerifyPwdEmail = async (e) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdAlert(null);
    const { ok, data } = await apiPost('/api/auth/verify-otp', {
      email: user.email,
      otp: pwdForm.currentCode,
      purpose: 'change-password'
    });
    setPwdLoading(false);
    if (ok) {
      setPwdAlert(null);
      setPwdStep(2);
      setTimerActive(false);
    } else {
      setPwdAlert({ message: data.error || 'Invalid verification code.', type: 'danger' });
    }
  };

  const passwordsMatch = pwdForm.newPassword !== '' && pwdForm.newPassword === pwdForm.confirmPassword;
  const showPasswordAlert = pwdForm.newPassword !== '' && pwdForm.confirmPassword !== '';

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordsMatch) return;
    setPwdLoading(true);
    setPwdAlert(null);

    const { ok, data } = await apiPost('/api/auth/change-password', {
      current_email: user.email,
      new_password: pwdForm.newPassword
    });

    if (ok) {
      setGlobalAlert({ message: 'Password updated successfully.', type: 'success' });
      setPwdStep(0);
    } else {
      setPwdAlert({ message: data.error || 'Failed to update password.', type: 'danger' });
    }
    setPwdLoading(false);
  };

  // ── 3. DISABLE ACCOUNT HANDLERS ──
  const handleStartDisable = () => {
    // Collapse & reset Change Email and Change Password sections
    setEmailStep(0);
    setEmailAlert(null);
    setEmailForm({ newEmail: '', currentCode: '', newCode: '', password: '' });
    setPwdStep(0);
    setPwdAlert(null);
    setPwdForm({ currentCode: '', newPassword: '', confirmPassword: '' });

    setDisableStep(1);
    setDisableAlert(null);
    setDisableCode('');
  };

  const handleConfirmDisableClick = async () => {
    setDisableLoading(true);
    setDisableAlert(null);
    const { ok, data } = await apiPost('/api/auth/send-otp', {
      email: user.email,
      purpose: 'disable-account'
    });
    setDisableLoading(false);
    if (ok) {
      setDisableStep(2);
      setTimer(300);
      setTimerActive(true);
      setDisableAlert({ message: 'A verification code was sent to your email to authorize deactivation. Enter code.', type: 'info' });
    } else {
      setDisableAlert({ message: data.error || 'Failed to send verification code.', type: 'danger' });
    }
  };

  const handleVerifyDisableCode = async (e) => {
    e.preventDefault();
    setDisableLoading(true);
    setDisableAlert(null);

    // Verify OTP first
    const { ok: otpOk, data: otpData } = await apiPost('/api/auth/verify-otp', {
      email: user.email,
      otp: disableCode,
      purpose: 'disable-account'
    });

    if (!otpOk) {
      setDisableAlert({ message: otpData.error || 'Invalid verification code.', type: 'danger' });
      setDisableLoading(false);
      return;
    }

    const { ok, data } = await apiPost('/api/auth/disable-account');

    if (ok) {
      setTimerActive(false);
      // Clear user context session
      await logout();
      // Redirect to landing page with persistent deactivation warning
      navigate('/', {
        state: {
          deactivationWarning: 'Your account has been disabled. You can restore your account within the next 24 hours. After 24 hours, your account will be permanently deactivated.'
        }
      });
    } else {
      setDisableAlert({ message: data.error || 'Failed to disable account.', type: 'danger' });
      setDisableLoading(false);
    }
  };

  const handleResendSettingsOtp = async () => {
    if (timer > 0) return;
    
    let targetEmail = user.email;
    let purpose = '';
    
    if (emailStep === 1) {
      purpose = 'change-email-current';
    } else if (emailStep === 3) {
      purpose = 'change-email-new';
      targetEmail = emailForm.newEmail;
    } else if (pwdStep === 1) {
      purpose = 'change-password';
    } else if (disableStep === 2) {
      purpose = 'disable-account';
    }
    
    if (!purpose) return;
    
    if (purpose.startsWith('change-email')) {
      setEmailLoading(true);
      setEmailAlert(null);
    } else if (purpose === 'change-password') {
      setPwdLoading(true);
      setPwdAlert(null);
    } else if (purpose === 'disable-account') {
      setDisableLoading(true);
      setDisableAlert(null);
    }
    
    const { ok, data } = await apiPost('/api/auth/send-otp', {
      email: targetEmail,
      purpose
    });
    
    setEmailLoading(false);
    setPwdLoading(false);
    setDisableLoading(false);
    
    if (ok) {
      setTimer(300);
      setTimerActive(true);
      if (emailStep === 1) {
        setEmailForm(prev => ({ ...prev, currentCode: '' }));
        setEmailAlert({ message: 'A new verification code was sent to your current email.', type: 'success' });
      } else if (emailStep === 3) {
        setEmailForm(prev => ({ ...prev, newCode: '' }));
        setEmailAlert({ message: 'A new verification code was sent to your new email.', type: 'success' });
      } else if (pwdStep === 1) {
        setPwdForm(prev => ({ ...prev, currentCode: '' }));
        setPwdAlert({ message: 'A new verification code was sent to your email.', type: 'success' });
      } else if (disableStep === 2) {
        setDisableCode('');
        setDisableAlert({ message: 'A new verification code was sent to your email.', type: 'success' });
      }
    } else {
      const alertSetter = purpose.startsWith('change-email') ? setEmailAlert : (purpose === 'change-password' ? setPwdAlert : setDisableAlert);
      alertSetter({ message: data.error || 'Failed to resend verification code.', type: 'danger' });
    }
  };

  const renderTimerBlock = () => {
    return (
      <div className="text-center mb-3" style={{ marginTop: '8px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {timer > 0 ? (
            <>Code expires in <strong style={{ color: 'var(--primary)' }}>{formatTimer(timer)}</strong></>
          ) : (
            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Code has expired</span>
          )}
        </div>
        <div style={{ marginTop: '10px' }}>
          {timer > 0 ? (
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Resend Code in {formatTimer(timer)}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResendSettingsOtp}
              className="btn btn-sm btn-outline-accent"
            >
              Resend Code
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="landing-page">
      <AppNavbar />
      
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 20px', paddingTop: '92px' }} className="fade-in">
        
        {/* Page-level Back Link */}
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={handleBack}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              textDecoration: 'none',
              color: 'var(--text-muted)',
              fontSize: '13.5px',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'color 0.2s ease-in-out',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => { e.target.style.color = 'var(--primary)'; }}
            onMouseLeave={(e) => { e.target.style.color = 'var(--text-muted)'; }}
          >
            ← Back
          </button>
        </div>

        {/* Heading aligned with card structure */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontWeight: 700, marginBottom: 6, fontSize: 22, margin: 0 }}>Settings</h2>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0 0', fontSize: '14px' }}>
            Manage your security options and account state
          </p>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .settings-grid {
            display: flex;
            flex-direction: column;
            gap: 24px;
            width: 100%;
          }
          .settings-card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
          }
          .settings-card-icon {
            width: 42px;
            height: 42px;
            border-radius: var(--radius-md);
            background: var(--primary-light);
            color: var(--primary);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
          }
          .inline-validation {
            font-size: 12.5px;
            font-weight: 600;
            margin-top: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .inline-validation.success { color: var(--success); }
          .inline-validation.danger { color: var(--danger); }
        `}} />

        <div className="settings-grid">
          
          <Alert message={globalAlert?.message} type={globalAlert?.type} onDismiss={() => setGlobalAlert(null)} />

          {/* ── CARD 1: CHANGE EMAIL ADDRESS ── */}
          <GlassCard>
            <div className="settings-card-header">
              <div className="settings-card-icon">
                <i className="bi bi-envelope"></i>
              </div>
              <div>
                <h4 style={{ fontWeight: 700, margin: 0, fontSize: 16 }}>Change Email Address</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>Update your registered login email address</p>
              </div>
            </div>

            <Alert message={emailAlert?.message} type={emailAlert?.type} onDismiss={() => setEmailAlert(null)} />

            {emailStep === 0 && (
              <button className="btn btn-outline-accent" onClick={handleStartEmailChange}>
                Change Email
              </button>
            )}

            {emailStep === 1 && (
              <form onSubmit={handleVerifyCurrentEmail}>
                <div className="mb-3">
                  <label className="form-label">Current Verification Code</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="Enter 6-digit code"
                    value={emailForm.currentCode}
                    onChange={(e) => setEmailForm({ ...emailForm, currentCode: e.target.value })}
                  />
                </div>
                {renderTimerBlock()}
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-accent" onClick={() => { setEmailStep(0); setTimerActive(false); }}>Cancel</button>
                  <button type="submit" className="btn btn-accent">Verify</button>
                </div>
              </form>
            )}

            {emailStep === 2 && (
              <form onSubmit={handleNewEmailSubmit}>
                <div className="mb-3">
                  <label className="form-label">New Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    required
                    placeholder="newemail@example.com"
                    value={emailForm.newEmail}
                    onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-accent" onClick={() => { setEmailStep(0); setTimerActive(false); }}>Cancel</button>
                  <button type="submit" className="btn btn-accent">Send Verification</button>
                </div>
              </form>
            )}

            {emailStep === 3 && (
              <form onSubmit={handleVerifyNewEmail}>
                <div className="mb-3">
                  <label className="form-label">New Verification Code</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="Enter 6-digit code"
                    value={emailForm.newCode}
                    onChange={(e) => setEmailForm({ ...emailForm, newCode: e.target.value })}
                  />
                </div>
                {renderTimerBlock()}
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-accent" onClick={() => { setEmailStep(0); setTimerActive(false); }}>Cancel</button>
                  <button type="submit" className="btn btn-accent">Verify</button>
                </div>
              </form>
            )}

            {emailStep === 4 && (
              <form onSubmit={handleSaveEmail}>
                <div className="mb-3">
                  <label className="form-label">Password Confirmation</label>
                  <input
                    type="password"
                    className="form-control"
                    required
                    placeholder="Enter your current password"
                    value={emailForm.password}
                    onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-accent" onClick={() => { setEmailStep(0); setTimerActive(false); }} disabled={emailLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-accent" disabled={emailLoading}>
                    {emailLoading ? <><InlineSpinner /> Saving...</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </GlassCard>

          {/* ── CARD 2: CHANGE PASSWORD ── */}
          <GlassCard>
            <div className="settings-card-header">
              <div className="settings-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
                <i className="bi bi-shield-lock"></i>
              </div>
              <div>
                <h4 style={{ fontWeight: 700, margin: 0, fontSize: 16 }}>Change Password</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>Secure your account with a new password credentials</p>
              </div>
            </div>

            <Alert message={pwdAlert?.message} type={pwdAlert?.type} onDismiss={() => setPwdAlert(null)} />

            {pwdStep === 0 && (
              <button className="btn btn-outline-accent" onClick={handleStartPasswordChange}>
                Change Password
              </button>
            )}

            {pwdStep === 1 && (
              <form onSubmit={handleVerifyPwdEmail}>
                <div className="mb-3">
                  <label className="form-label">Verification Code</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="Enter 6-digit code"
                    value={pwdForm.currentCode}
                    onChange={(e) => setPwdForm({ ...pwdForm, currentCode: e.target.value })}
                  />
                </div>
                {renderTimerBlock()}
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-accent" onClick={() => { setPwdStep(0); setTimerActive(false); }}>Cancel</button>
                  <button type="submit" className="btn btn-accent">Verify</button>
                </div>
              </form>
            )}

            {pwdStep === 2 && (
              <form onSubmit={handleSavePassword}>
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="form-control"
                      required
                      placeholder="Create a strong password"
                      style={{ paddingRight: '44px' }}
                      value={pwdForm.newPassword}
                      onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPwd(!showPwd)}>
                      <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Confirm Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showConfirmPwd ? 'text' : 'password'}
                      className="form-control"
                      required
                      placeholder="Confirm your password"
                      style={{ paddingRight: '44px' }}
                      value={pwdForm.confirmPassword}
                      onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowConfirmPwd(!showConfirmPwd)}>
                      <i className={`bi ${showConfirmPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                {showPasswordAlert && (
                  <div className="mb-3">
                    <div className={`inline-validation ${passwordsMatch ? 'success' : 'danger'}`}>
                      <i className={`bi ${passwordsMatch ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`}></i>
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </div>
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-accent" onClick={() => { setPwdStep(0); setTimerActive(false); }} disabled={pwdLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-accent" disabled={pwdLoading || !passwordsMatch}>
                    {pwdLoading ? <><InlineSpinner /> Saving...</> : 'Save Password'}
                  </button>
                </div>
              </form>
            )}
          </GlassCard>

          {/* ── CARD 3: DISABLE ACCOUNT ── */}
          <GlassCard style={{ borderColor: 'rgba(220, 38, 38, 0.2)' }}>
            <div className="settings-card-header">
              <div className="settings-card-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                <i className="bi bi-exclamation-octagon"></i>
              </div>
              <div>
                <h4 style={{ fontWeight: 700, margin: 0, fontSize: 16 }}>Disable Account</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>Temporarily disable your profile with a 24-hour grace period recovery option</p>
              </div>
            </div>

            <Alert message={disableAlert?.message} type={disableAlert?.type} onDismiss={() => setDisableAlert(null)} />

            {disableStep === 0 && (
              <button className="btn btn-danger" onClick={handleStartDisable}>
                Disable Account
              </button>
            )}

            {disableStep === 1 && (
              <div>
                <p style={{ fontSize: '13.5px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                  Are you sure you want to disable your account? You will be logged out and have exactly 24 hours to restore your profile before permanent deactivation.
                </p>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-accent" onClick={() => setDisableStep(0)}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleConfirmDisableClick}>Yes, Disable Account</button>
                </div>
              </div>
            )}

            {disableStep === 2 && (
              <form onSubmit={handleVerifyDisableCode}>
                <div className="mb-3">
                  <label className="form-label">Enter Verification Code</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="Enter 6-digit code"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                  />
                </div>
                {renderTimerBlock()}
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-accent" onClick={() => { setDisableStep(0); setTimerActive(false); }} disabled={disableLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={disableLoading}>
                    {disableLoading ? <><InlineSpinner /> Processing...</> : 'Verify & Disable'}
                  </button>
                </div>
              </form>
            )}
          </GlassCard>

        </div>
      </div>
    </div>
  );
}
