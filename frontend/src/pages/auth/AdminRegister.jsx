/**
 * AdminRegister.jsx
 * -----------------
 * Admin registration page — converted into a professional multi-step wizard.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminRegister } from '../../services/authService';
import { apiPost } from '../../services/api';
import { Alert, InlineSpinner, ApartEaseLogo } from '../../components/ui';
import LandingNavbar from '../../components/layout/LandingNavbar';

export default function AdminRegister() {
  const [step, setStep] = useState(1);

  useEffect(() => {
    document.title = 'Admin Register | ApartEase';
  }, []);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    apartment_name: '',
    apartment_address: '',
    accessCode: ''
  });
  
  const [verificationCode, setVerificationCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Normalization for access code (uppercase, strip spaces & special characters)
  const handleAccessCodeChange = (e) => {
    const rawVal = e.target.value;
    const sanitizedVal = rawVal.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setForm({ ...form, accessCode: sanitizedVal });
  };

  // Step validation helpers
  const isStep1Valid = form.name.trim() !== '' && form.email.trim() !== '' && form.email.includes('@');
  
  const handleVerifyEmailClick = async (e) => {
    e.preventDefault();
    if (!isStep1Valid) {
      setAlert({ message: 'Please enter a valid name and email address.', type: 'warning' });
      return;
    }
    setLoading(true);
    setAlert(null);

    const { ok, data } = await apiPost('/api/auth/send-otp', {
      email: form.email,
      purpose: 'admin-register'
    });
    setLoading(false);

    if (ok) {
      setAlert(null);
      setStep(2);
      setTimer(300);
      setTimerActive(true);
    } else {
      setAlert({ message: data.error || 'Failed to send verification code.', type: 'danger' });
    }
  };

  const handleVerificationCodeChange = async (e) => {
    const code = e.target.value;
    setVerificationCode(code);
    if (code.length === 6) {
      setLoading(true);
      const { ok, data } = await apiPost('/api/auth/verify-otp', {
        email: form.email,
        otp: code,
        purpose: 'admin-register'
      });
      setLoading(false);
      if (ok) {
        setIsEmailVerified(true);
        setTimerActive(false);
        setAlert({ message: 'Email verified successfully. You can now proceed.', type: 'success' });
      } else {
        setIsEmailVerified(false);
        setAlert({ message: data.error || 'Invalid verification code.', type: 'danger' });
      }
    } else {
      setIsEmailVerified(false);
    }
  };

  const handleResendRegisterOtp = async () => {
    if (timer > 0) return;
    setLoading(true);
    setAlert(null);

    const { ok, data } = await apiPost('/api/auth/send-otp', {
      email: form.email,
      purpose: 'admin-register'
    });
    setLoading(false);

    if (ok) {
      setTimer(300);
      setTimerActive(true);
      setVerificationCode('');
      setIsEmailVerified(false);
      setAlert({ message: 'A new verification code has been sent!', type: 'success' });
    } else {
      setAlert({ message: data.error || 'Failed to resend verification code.', type: 'danger' });
    }
  };

  const handleStep2Continue = (e) => {
    e.preventDefault();
    if (!isEmailVerified) return;
    setAlert(null);
    setStep(3);
  };

  const passwordsMatch = form.password !== '' && form.password === form.confirmPassword;
  const showPasswordAlert = form.password !== '' && form.confirmPassword !== '';

  const handleStep3Next = (e) => {
    e.preventDefault();
    if (!passwordsMatch) return;
    setAlert(null);
    setStep(4);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.apartment_name.trim() === '' || form.apartment_address.trim() === '' || form.accessCode.trim() === '') {
      setAlert({ message: 'Please fill in all apartment details.', type: 'warning' });
      return;
    }
    setLoading(true);
    setAlert(null);

    // Send fields to Flask API, including the access_code
    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      apartment_name: form.apartment_name,
      apartment_address: form.apartment_address,
      access_code: form.accessCode
    };

    const { ok, data } = await adminRegister(payload);

    if (ok) {
      setAlert({ message: 'Account created successfully. Redirecting to login...', type: 'success' });
      setTimeout(() => navigate('/admin/login'), 1500);
    } else {
      setAlert({ message: data.error || 'Registration failed', type: 'danger' });
      setLoading(false);
    }
  };

  const progressPercent = step * 25;

  return (
    <div className="landing-page">
      <LandingNavbar />
      
      {/* Local styles for transition animations, role tabs, and progress bar styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .wizard-card {
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .progress-bar-container {
          height: 6px;
          background-color: var(--border);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .progress-bar-fill {
          height: 100%;
          background-color: var(--primary);
          border-radius: 3px;
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .wizard-step-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-bottom: 8px;
          display: block;
        }
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
        {/* Step 1 Card */}
        {step === 1 && (
          <div className="glass-card auth-card wizard-card" style={{ maxWidth: 480 }}>
            <Link to="/" className="auth-back-home">
              <i className="bi bi-arrow-left"></i> Home
            </Link>
            
            {/* Tabs Selector at top */}
            <div className="auth-tabs">
              <button className="auth-tab-btn active" disabled>Admin</button>
              <Link to="/resident/register" className="auth-tab-btn">Resident</Link>
              <div className="auth-tabs-underline" style={{ left: '0%', width: '50%' }}></div>
            </div>

            <div className="text-center mb-3" style={{ display: 'flex', justifyContent: 'center' }}>
              <ApartEaseLogo size="lg" showText={false} />
            </div>
            
            <span className="wizard-step-label">Step 1 of 4</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>

            <h2>Create Your Admin Account</h2>
            <p className="auth-subtitle">Step 1: Enter your personal credentials</p>

            <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

            <form onSubmit={handleVerifyEmailClick} autoComplete="off">
              <div className="mb-3">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" name="name" required
                  placeholder="John Doe" value={form.name} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-control" name="email" required
                  placeholder="admin@example.com" value={form.email} onChange={handleChange} />
              </div>
              
              <button type="submit" className="btn btn-accent btn-w-full" disabled={!isStep1Valid}>
                Verify Email <i className="bi bi-arrow-right-short" style={{ fontSize: '18px', marginLeft: '4px' }}></i>
              </button>
            </form>

            <div className="text-center mt-4">
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Already have an account?</span>
              {' '}<Link to="/admin/login" style={{ fontSize: '13px', fontWeight: 600 }}>Sign in</Link>
            </div>
          </div>
        )}

        {/* Step 2 Card */}
        {step === 2 && (
          <div className="glass-card auth-card wizard-card" style={{ maxWidth: 480 }}>
            <button onClick={() => { setStep(1); setAlert(null); setTimerActive(false); }} className="auth-back-home" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <i className="bi bi-arrow-left"></i> Back
            </button>
            <div className="text-center mb-3">
              <div className="auth-icon-badge" style={{ color: 'var(--info)', background: 'var(--info-bg)' }}>
                <i className="bi bi-envelope-check"></i>
              </div>
            </div>
            
            <span className="wizard-step-label">Step 2 of 4</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>

            <h2>Verify Your Email</h2>
            <p className="auth-subtitle" style={{ marginBottom: '16px' }}>
              Verification code has been sent to:<br />
              <strong style={{ color: 'var(--text-primary)' }}>{form.email}</strong>
            </p>

            <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

            <form onSubmit={handleStep2Continue} autoComplete="off">
              <div className="mb-3">
                <label className="form-label">Verification Code</label>
                <input type="text" className="form-control" required
                  placeholder="Enter 6-digit code" value={verificationCode} onChange={handleVerificationCodeChange} />
              </div>
              
              {/* Countdown timer & Resend Code link */}
              <div className="text-center mb-4">
                <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                  {!isEmailVerified ? (
                    timer > 0 ? (
                      <>Code expires in <strong style={{ color: 'var(--primary)' }}>{formatTimer(timer)}</strong></>
                    ) : (
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Code has expired</span>
                    )
                  ) : (
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>Email Verified!</span>
                  )}
                </div>
                {!isEmailVerified && (
                  <div style={{ marginTop: '10px' }}>
                    {timer > 0 ? (
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Resend Code in {formatTimer(timer)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendRegisterOtp}
                        className="btn btn-sm btn-outline-accent"
                        disabled={loading}
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-accent btn-w-full" disabled={!isEmailVerified}>
                Continue <i className="bi bi-arrow-right-short" style={{ fontSize: '18px', marginLeft: '4px' }}></i>
              </button>
            </form>
          </div>
        )}

        {/* Step 3 Card */}
        {step === 3 && (
          <div className="glass-card auth-card wizard-card" style={{ maxWidth: 480 }}>
            <button onClick={() => { setStep(2); setAlert(null); }} className="auth-back-home" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <i className="bi bi-arrow-left"></i> Back
            </button>
            <div className="text-center mb-3">
              <div className="auth-icon-badge">
                <i className="bi bi-shield-lock"></i>
              </div>
            </div>
            
            <span className="wizard-step-label">Step 3 of 4</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>

            <h2>Create Password</h2>
            <p className="auth-subtitle">Step 3: Secure your admin account</p>

            {showPasswordAlert && (
              <div className="mb-4">
                <div style={{ fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: passwordsMatch ? 'var(--success)' : 'var(--danger)' }}>
                  <i className={`bi ${passwordsMatch ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`}></i>
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </div>
              </div>
            )}

            <form onSubmit={handleStep3Next} autoComplete="off">
              <div className="mb-3">
                <label className="form-label">Password</label>
                <div className="password-wrapper">
                  <input type={showPwd ? 'text' : 'password'} className="form-control" name="password" required
                    placeholder="Create a strong password" style={{ paddingRight: '44px' }}
                    value={form.password} onChange={handleChange} />
                  <button type="button" className="password-toggle" onClick={() => setShowPwd(!showPwd)}>
                    <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label">Confirm Password</label>
                <div className="password-wrapper">
                  <input type={showConfirmPwd ? 'text' : 'password'} className="form-control" name="confirmPassword" required
                    placeholder="Confirm your password" style={{ paddingRight: '44px' }}
                    value={form.confirmPassword} onChange={handleChange} />
                  <button type="button" className="password-toggle" onClick={() => setShowConfirmPwd(!showConfirmPwd)}>
                    <i className={`bi ${showConfirmPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
                </div>
              </div>
              
              <button type="submit" className="btn btn-accent btn-w-full" disabled={!passwordsMatch}>
                Next <i className="bi bi-arrow-right-short" style={{ fontSize: '18px', marginLeft: '4px' }}></i>
              </button>
            </form>
          </div>
        )}

        {/* Step 4 Card */}
        {step === 4 && (
          <div className="glass-card auth-card wizard-card" style={{ maxWidth: 480 }}>
            <button onClick={() => { setStep(3); setAlert(null); }} className="auth-back-home" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <i className="bi bi-arrow-left"></i> Back
            </button>
            <div className="text-center mb-3">
              <div className="auth-icon-badge" style={{ color: 'var(--info)', background: 'var(--info-bg)' }}>
                <i className="bi bi-building"></i>
              </div>
            </div>
            
            <span className="wizard-step-label">Step 4 of 4</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>

            <h2>Apartment Details</h2>
            <p className="auth-subtitle">Step 4: Finalize your community registration</p>

            <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="mb-3">
                <label className="form-label">Apartment Name</label>
                <input type="text" className="form-control" name="apartment_name" required
                  placeholder="e.g. Sunrise Residency" value={form.apartment_name} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <label className="form-label">Apartment Address</label>
                <textarea className="form-control" name="apartment_address" required rows="3"
                  placeholder="123 Main Street, Bangalore, Karnataka" value={form.apartment_address} onChange={handleChange}
                  style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '10px 14px', fontFamily: 'inherit', fontSize: '14px', width: '100%', resize: 'none' }}
                />
              </div>
              <div className="mb-4">
                <label className="form-label">Admin Access Code</label>
                <input type="text" className="form-control" name="accessCode" required
                  placeholder="e.g. APT123" value={form.accessCode} onChange={handleAccessCodeChange} />
                <div className="form-text" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  This code will be shared with residents to connect with your apartment. (Letters and numbers only).
                </div>
              </div>
              
              <button type="submit" className="btn btn-accent btn-w-full" disabled={loading}>
                {loading ? <><InlineSpinner /> Creating Account...</> : <><i className="bi bi-person-plus"></i> Create Account</>}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
