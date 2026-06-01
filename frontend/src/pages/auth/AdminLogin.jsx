/**
 * AdminLogin.jsx
 * ---------------
 * Admin login page with email/password form.
 * Redirects to admin dashboard on success.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { adminLogin } from '../../services/authService';
import { Alert, InlineSpinner, ApartEaseLogo } from '../../components/ui';
import LandingNavbar from '../../components/layout/LandingNavbar';
import { apiPost } from '../../services/api';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    document.title = 'Admin Login | ApartEase';
  }, []);


  // Recovery Intercept State
  const [pendingRecovery, setPendingRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState(0); // 0 = login form, 1 = enter email, 2 = verify OTP, 3 = reset password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
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

  const handleSendRecoveryOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setAlert({ message: 'Please enter a valid email address.', type: 'warning' });
      return;
    }
    setLoading(true);
    setAlert(null);

    const { ok, status, data } = await apiPost('/api/auth/send-otp', {
      email: forgotEmail.trim(),
      purpose: 'forgot-password-admin'
    });
    setLoading(false);

    if (ok) {
      setForgotStep(2);
      setTimer(300);
      setTimerActive(true);
      setForgotCode('');
      setAlert({ message: 'Verification code sent to your email address.', type: 'success' });
    } else {
      const msg = status === 404 ? 'Email address is not registered.' : (data.error || 'Failed to send verification code.');
      setAlert({ message: msg, type: 'danger' });
    }
  };

  const handleResendRecoveryOtp = async () => {
    if (timer > 0) return;
    setLoading(true);
    setAlert(null);

    const { ok, data } = await apiPost('/api/auth/send-otp', {
      email: forgotEmail.trim(),
      purpose: 'forgot-password-admin'
    });
    setLoading(false);

    if (ok) {
      setTimer(300);
      setTimerActive(true);
      setForgotCode('');
      setAlert({ message: 'A new verification code has been sent!', type: 'success' });
    } else {
      setAlert({ message: data.error || 'Failed to resend verification code.', type: 'danger' });
    }
  };

  const handleVerifyRecoveryOtp = async (code) => {
    setLoading(true);
    setAlert(null);
    const { ok, data } = await apiPost('/api/auth/verify-otp', {
      email: forgotEmail.trim(),
      otp: code,
      purpose: 'forgot-password-admin'
    });
    setLoading(false);

    if (ok) {
      setForgotStep(3);
      setTimerActive(false);
      setAlert({ message: 'Code verified successfully! Choose your new password.', type: 'success' });
    } else {
      setAlert({ message: data.error || 'Invalid verification code.', type: 'danger' });
    }
  };

  const handleForgotCodeChange = async (e) => {
    const val = e.target.value;
    setForgotCode(val);
    if (val.length === 6) {
      await handleVerifyRecoveryOtp(val);
    }
  };

  const handleVerifyRecoveryOtpSubmit = async (e) => {
    e.preventDefault();
    if (forgotCode.length !== 6) {
      setAlert({ message: 'Please enter a 6-digit code.', type: 'warning' });
      return;
    }
    await handleVerifyRecoveryOtp(forgotCode);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setAlert({ message: 'Passwords do not match.', type: 'danger' });
      return;
    }
    setLoading(true);
    setAlert(null);

    const { ok, data } = await apiPost('/api/auth/reset-password', {
      email: forgotEmail.trim(),
      role: 'admin',
      new_password: newPassword
    });
    setLoading(false);

    if (ok) {
      setForgotStep(0);
      setEmail(forgotEmail.trim());
      setPassword('');
      setAlert({ message: 'Password reset successfully! Please sign in with your new password.', type: 'success' });
    } else {
      setAlert({ message: data.error || 'Failed to reset password.', type: 'danger' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    const { ok, data } = await adminLogin(email.trim(), password);

    if (ok) {
      if (data.pending_deactivation) {
        setRecoveryEmail(email.trim());
        setPendingRecovery(true);
        setLoading(false);
        return;
      }
      setAlert({ message: 'Login successful! Redirecting...', type: 'success' });
      // Set user in auth context with admin role
      login({ ...data.admin, role: 'admin' });
      setTimeout(() => navigate('/admin/dashboard'), 600);
    } else {
      setAlert({ message: data.error || 'Login failed', type: 'danger' });
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRecoveryLoading(true);
    setAlert(null);
    const { ok, data } = await apiPost('/api/auth/restore-account', {
      email: recoveryEmail,
      role: 'admin'
    });
    if (ok) {
      setAlert({ message: 'Account successfully restored! Redirecting...', type: 'success' });
      login({ ...data.user, role: 'admin' });
      setTimeout(() => navigate('/admin/dashboard'), 1000);
    } else {
      setAlert({ message: data.error || 'Failed to restore account.', type: 'danger' });
    }
    setRecoveryLoading(false);
  };

  const handleContinueDeactivation = () => {
    setAlert({ message: 'Your account deactivation schedule remains active.', type: 'info' });
    setTimeout(() => {
      setPendingRecovery(false);
      setAlert(null);
      navigate('/');
    }, 1500);
  };

  return (
    <div className="landing-page">
      <LandingNavbar />
      
      {/* ── Role Tabs CSS ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .auth-tabs {
          display: flex;
          border-bottom: 1px solid var(--border);
          margin-bottom: 24px;
          position: relative;
        }
        .auth-tab-btn {
          flex: 1;
          background: none;
          border: none;
          padding: 12px 16px;
          font-size: 14.5px;
          font-weight: 700;
          font-family: inherit;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.25s ease;
          text-align: center;
          text-decoration: none;
        }
        .auth-tab-btn.active {
          color: var(--primary);
        }
        .auth-tabs-underline {
          position: absolute;
          bottom: -1px;
          height: 2px;
          background-color: var(--primary);
          transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (max-width: 576px) {
          .auth-tab-btn {
            font-size: 13.5px;
            padding: 10px 12px;
          }
        }
      `}} />

      <div className="auth-wrapper auth-page-body">
        <div className="glass-card auth-card">
          {forgotStep === 0 && (
            <Link to="/" className="auth-back-home">
              <i className="bi bi-arrow-left"></i> Home
            </Link>
          )}
          
          {/* Tabs Selector at top */}
          {forgotStep === 0 && !pendingRecovery && (
            <div className="auth-tabs">
              <button className="auth-tab-btn active" disabled>Admin</button>
              <Link to="/resident/login" className="auth-tab-btn">Resident</Link>
              <div className="auth-tabs-underline" style={{ left: '0%', width: '50%' }}></div>
            </div>
          )}

          <div className="text-center mb-3" style={{ display: 'flex', justifyContent: 'center' }}>
            <ApartEaseLogo size="lg" showText={false} />
          </div>

          {forgotStep === 0 && (
            <>
              <h2>Admin Login</h2>
              <p className="auth-subtitle">Sign in to manage your apartment</p>
            </>
          )}

          <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

          {pendingRecovery ? (
            <div className="text-center">
              <div className="auth-icon-badge" style={{ color: 'var(--warning)', background: 'var(--warning-bg)', width: '64px', height: '64px', fontSize: '28px', marginBottom: '20px' }}>
                <i className="bi bi-hourglass-split"></i>
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>Account Recovery Pending</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                Your account is scheduled for deactivation.<br />
                You can restore your account before the deactivation period expires.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button type="button" className="btn btn-accent btn-w-full" onClick={handleRestore} disabled={recoveryLoading}>
                  {recoveryLoading ? <InlineSpinner /> : <><i className="bi bi-arrow-counterclockwise"></i> Restore Account</>}
                </button>
                <button type="button" className="btn btn-outline-accent btn-w-full" onClick={handleContinueDeactivation} disabled={recoveryLoading}>
                  Continue Deactivation
                </button>
              </div>
            </div>
          ) : forgotStep === 1 ? (
            <div className="fade-in">
              <button onClick={() => { setForgotStep(0); setAlert(null); }} className="auth-back-home" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '20px' }}>
                <i className="bi bi-arrow-left"></i> Back to Login
              </button>
              <div className="text-center mb-3">
                <div className="auth-icon-badge" style={{ color: 'var(--primary)', background: 'var(--primary-bg)' }}>
                  <i className="bi bi-shield-lock"></i>
                </div>
              </div>
              <h2 className="text-center">Forgot Password</h2>
              <p className="auth-subtitle">Enter your registered email address to recover your password.</p>
              
              <form onSubmit={handleSendRecoveryOtp} autoComplete="off">
                <div className="mb-4">
                  <label className="form-label" htmlFor="forgot-email">Registered Email Address</label>
                  <input
                    type="email" className="form-control" id="forgot-email"
                    placeholder="admin@example.com" required
                    value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-accent btn-w-full" disabled={loading}>
                  {loading ? <InlineSpinner /> : <><i className="bi bi-envelope"></i> Send Verification Code</>}
                </button>
              </form>
            </div>
          ) : forgotStep === 2 ? (
            <div className="fade-in">
              <button onClick={() => { setForgotStep(1); setAlert(null); }} className="auth-back-home" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '20px' }}>
                <i className="bi bi-arrow-left"></i> Back
              </button>
              <div className="text-center mb-3">
                <div className="auth-icon-badge" style={{ color: 'var(--info)', background: 'var(--info-bg)' }}>
                  <i className="bi bi-envelope-check"></i>
                </div>
              </div>
              <h2 className="text-center">Verify Your Email</h2>
              <p className="auth-subtitle" style={{ marginBottom: '16px' }}>
                Verification code has been sent to:<br />
                <strong style={{ color: 'var(--text-primary)' }}>{forgotEmail}</strong>
              </p>
              
              <form onSubmit={handleVerifyRecoveryOtpSubmit} autoComplete="off">
                <div className="mb-3">
                  <label className="form-label">Verification Code</label>
                  <input
                    type="text" className="form-control text-center" required
                    placeholder="Enter 6-digit code" maxLength={6}
                    style={{ letterSpacing: '4px', fontSize: '18px', fontWeight: 'bold' }}
                    value={forgotCode} onChange={handleForgotCodeChange}
                  />
                </div>
                
                {/* Real-time countdown timer */}
                <div className="text-center mb-4">
                  <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                    {timer > 0 ? (
                      <>Code expires in <strong style={{ color: 'var(--primary)' }}>{formatTimer(timer)}</strong></>
                    ) : (
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Code has expired</span>
                    )}
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    {timer > 0 ? (
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Resend Code in {formatTimer(timer)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendRecoveryOtp}
                        className="btn btn-sm btn-outline-accent"
                        disabled={loading}
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>

                <button type="submit" className="btn btn-accent btn-w-full" disabled={loading || forgotCode.length !== 6}>
                  {loading ? <InlineSpinner /> : 'Verify Code'}
                </button>
              </form>
            </div>
          ) : forgotStep === 3 ? (
            <div className="fade-in">
              <div className="text-center mb-3">
                <div className="auth-icon-badge" style={{ color: 'var(--success)', background: 'var(--success-bg)' }}>
                  <i className="bi bi-shield-lock-fill"></i>
                </div>
              </div>
              <h2 className="text-center">Reset Password</h2>
              <p className="auth-subtitle">Create a secure new password for your account.</p>
              
              <form onSubmit={handleResetPassword} autoComplete="off">
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showConfirmPwd ? 'text' : 'password'} className="form-control" required
                      placeholder="Create a strong password"
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="form-label">Confirm New Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showConfirmPwd ? 'text' : 'password'} className="form-control" required
                      placeholder="Confirm your new password"
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowConfirmPwd(!showConfirmPwd)}>
                      <i className={`bi ${showConfirmPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-accent btn-w-full" disabled={loading}>
                  {loading ? <InlineSpinner /> : 'Reset Password'}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="mb-3">
                <label className="form-label" htmlFor="admin-email">Email Address</label>
                <input
                  type="email" className="form-control" id="admin-email"
                  placeholder="admin@example.com" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="admin-password">Password</label>
                <div className="password-wrapper">
                  <input
                    type={showPwd ? 'text' : 'password'} className="form-control" id="admin-password"
                    placeholder="Enter your password" required
                    style={{ paddingRight: '44px' }}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPwd(!showPwd)}>
                    <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email.trim());
                      setForgotStep(1);
                      setAlert(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--primary)',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontFamily: 'inherit'
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-accent btn-w-full" disabled={loading}>
                {loading ? <><InlineSpinner /> Signing in...</> : <><i className="bi bi-box-arrow-in-right"></i> Sign In</>}
              </button>
            </form>
          )}

          {forgotStep === 0 && (
            <div className="text-center mt-4">
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Don&apos;t have an account?</span>
              {' '}<Link to="/admin/register" style={{ fontSize: '13px', fontWeight: 600 }}>Register here</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
