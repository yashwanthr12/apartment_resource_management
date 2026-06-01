/**
 * ResidentRegister.jsx
 * --------------------
 * Resident registration page — converted into a professional multi-step wizard.
 * Supported by session persistence, apartment code verification, and a pending approval screen.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { residentRegister } from '../../services/authService';
import { apiGet, apiPost } from '../../services/api';
import { Alert, InlineSpinner, ApartEaseLogo } from '../../components/ui';
import LandingNavbar from '../../components/layout/LandingNavbar';

export default function ResidentRegister() {
  useEffect(() => {
    document.title = 'Resident Register | ApartEase';
  }, []);

  // Load state from localStorage on initialization for Session Persistence
  const [step, setStep] = useState(() => {

    try {
      const saved = localStorage.getItem('apartease_resident_reg_flow');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step) return parsed.step;
      }
    } catch (e) {}
    return 1;
  });

  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem('apartease_resident_reg_flow');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.form) return parsed.form;
      }
    } catch (e) {}
    return {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      house_number: '',
      apartment_name: '',
      accessCode: ''
    };
  });

  const [verificationCode, setVerificationCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(() => {
    try {
      const saved = localStorage.getItem('apartease_resident_reg_flow');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isEmailVerified !== undefined) return parsed.isEmailVerified;
      }
    } catch (e) {}
    return false;
  });

  const [isCodeVerified, setIsCodeVerified] = useState(() => {
    try {
      const saved = localStorage.getItem('apartease_resident_reg_flow');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isCodeVerified !== undefined) return parsed.isCodeVerified;
      }
    } catch (e) {}
    return false;
  });

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

  // Save state to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('apartease_resident_reg_flow', JSON.stringify({
        step,
        form,
        isEmailVerified,
        isCodeVerified
      }));
    } catch (e) {}
  }, [step, form, isEmailVerified, isCodeVerified]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Normalization for access code (uppercase, alphanumeric only)
  const handleAccessCodeChange = (e) => {
    const rawVal = e.target.value;
    const sanitizedVal = rawVal.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setForm({ ...form, accessCode: sanitizedVal });
    setIsCodeVerified(false); // Reset verified state if code changes
  };

  // Step 1 Validation
  const isStep1Valid = form.name.trim() !== '' && form.email.trim() !== '' && form.email.includes('@');

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!isStep1Valid) {
      setAlert({ message: 'Please enter a valid name and email address.', type: 'warning' });
      return;
    }
    setLoading(true);
    setAlert(null);

    const { ok, data } = await apiPost('/api/auth/send-otp', {
      email: form.email,
      purpose: 'resident-register'
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

  // Step 2 Verification
  const handleVerificationCodeChange = async (e) => {
    const code = e.target.value;
    setVerificationCode(code);
    if (code.length === 6) {
      setLoading(true);
      const { ok, data } = await apiPost('/api/auth/verify-otp', {
        email: form.email,
        otp: code,
        purpose: 'resident-register'
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
      purpose: 'resident-register'
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

  // Step 3 Password validation
  const passwordsMatch = form.password !== '' && form.password === form.confirmPassword;
  const showPasswordAlert = form.password !== '' && form.confirmPassword !== '';

  const handleStep3Next = (e) => {
    e.preventDefault();
    if (!passwordsMatch) return;
    setAlert(null);
    setStep(4);
  };

  // Step 4 Apartment Code Verification
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!form.accessCode.trim()) {
      setAlert({ message: 'Please enter an access code.', type: 'warning' });
      return;
    }
    setLoading(true);
    setAlert(null);

    const { ok, data } = await apiGet(`/api/apartments/verify-code?code=${encodeURIComponent(form.accessCode)}`);

    if (ok) {
      setForm(prev => ({ ...prev, apartment_name: data.apartment_name }));
      setIsCodeVerified(true);
      setAlert({ message: 'Apartment found successfully. You can now proceed.', type: 'success' });
    } else {
      setIsCodeVerified(false);
      setAlert({ message: data.error || 'Invalid access code. Please try again.', type: 'danger' });
    }
    setLoading(false);
  };

  const handleStep4Continue = (e) => {
    e.preventDefault();
    if (!isCodeVerified) return;
    setAlert(null);
    setStep(5);
  };

  // Step 5 Submit & Finalize Registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.house_number.trim()) {
      setAlert({ message: 'Please enter your house/flat number.', type: 'warning' });
      return;
    }
    setLoading(true);
    setAlert(null);

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      house_number: form.house_number,
      apartment_name: form.apartment_name
    };

    const { ok, data } = await residentRegister(payload);

    if (ok) {
      // Set step to pending_approval in state and store
      setStep('pending_approval');
    } else {
      setAlert({ message: data.error || 'Registration failed. Please try again.', type: 'danger' });
    }
    setLoading(false);
  };

  // Reset the registration flow
  const handleStartOver = () => {
    localStorage.removeItem('apartease_resident_reg_flow');
    setStep(1);
    setForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      house_number: '',
      apartment_name: '',
      accessCode: ''
    });
    setVerificationCode('');
    setIsEmailVerified(false);
    setIsCodeVerified(false);
    setAlert(null);
  };

  const progressPercent = typeof step === 'number' ? step * 20 : 100;

  return (
    <div className="landing-page">
      <LandingNavbar />
      
      {/* Local styles for transition animations, role tabs, and wizard custom layouts */}
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
        
        .waiting-status-card {
          text-align: center;
          padding: 12px 8px;
        }
        .waiting-subtitle {
          color: var(--text-secondary);
          font-size: 14.5px;
          line-height: 1.6;
          margin-top: 16px;
        }
        @media (max-width: 576px) {
          .auth-tab-btn {
            font-size: 13.5px;
            padding: 10px 12px;
          }
        }
      `}} />

      <div className="auth-wrapper auth-page-body">
        
        {/* STEP 1: BASIC DETAILS */}
        {step === 1 && (
          <div className="glass-card auth-card wizard-card" style={{ maxWidth: 480 }}>
            <Link to="/" className="auth-back-home">
              <i className="bi bi-arrow-left"></i> Home
            </Link>
            
            {/* Tabs Selector at top */}
            <div className="auth-tabs">
              <Link to="/admin/register" className="auth-tab-btn">Admin</Link>
              <button className="auth-tab-btn active" disabled>Resident</button>
              <div className="auth-tabs-underline" style={{ left: '50%', width: '50%' }}></div>
            </div>

            <div className="text-center mb-3" style={{ display: 'flex', justifyContent: 'center' }}>
              <ApartEaseLogo size="lg" showText={false} />
            </div>
            
            <span className="wizard-step-label">Step 1 of 5</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>

            <h2>Create Your Resident Account</h2>
            <p className="auth-subtitle">Step 1: Enter your personal credentials</p>

            <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

            <form onSubmit={handleStep1Submit} autoComplete="off">
              <div className="mb-3">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" name="name" required
                  placeholder="John Doe" value={form.name} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-control" name="email" required
                  placeholder="resident@example.com" value={form.email} onChange={handleChange} />
              </div>
              
              <button type="submit" className="btn btn-accent btn-w-full" disabled={!isStep1Valid}>
                Verify Email <i className="bi bi-arrow-right-short" style={{ fontSize: '18px', marginLeft: '4px' }}></i>
              </button>
            </form>

            <div className="text-center mt-4">
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Already registered?</span>
              {' '}<Link to="/resident/login" style={{ fontSize: '13px', fontWeight: 600 }}>Sign in</Link>
            </div>
          </div>
        )}

        {/* STEP 2: EMAIL VERIFICATION */}
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
            
            <span className="wizard-step-label">Step 2 of 5</span>
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

        {/* STEP 3: PASSWORD CREATION */}
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
            
            <span className="wizard-step-label">Step 3 of 5</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>

            <h2>Create Password</h2>
            <p className="auth-subtitle">Step 3: Secure your resident account</p>

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
              <div className="mb-3">
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

              {showPasswordAlert && (
                <div className="mb-4">
                  <div className={`inline-validation ${passwordsMatch ? 'success' : 'danger'}`}>
                    <i className={`bi ${passwordsMatch ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`}></i>
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                </div>
              )}
              
              <button type="submit" className="btn btn-accent btn-w-full" disabled={!passwordsMatch}>
                Continue <i className="bi bi-arrow-right-short" style={{ fontSize: '18px', marginLeft: '4px' }}></i>
              </button>
            </form>
          </div>
        )}

        {/* STEP 4: APARTMENT ACCESS CODE VERIFICATION */}
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
            
            <span className="wizard-step-label">Step 4 of 5</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>

            <h2>Apartment Connection</h2>
            <p className="auth-subtitle">Step 4: Connect to your apartment complex</p>

            <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

            <form onSubmit={handleVerifyCode} autoComplete="off">
              <div className="mb-3">
                <label className="form-label">Apartment Access Code</label>
                <div className="d-flex gap-2">
                  <input type="text" className="form-control" name="accessCode" required
                    placeholder="e.g. APT123" value={form.accessCode} onChange={handleAccessCodeChange} />
                  <button type="submit" className="btn btn-outline-accent" disabled={loading || !form.accessCode.trim()}>
                    {loading ? <InlineSpinner /> : 'Verify'}
                  </button>
                </div>
                <div className="form-text" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Ask your apartment administrator for the access code generated during registration.
                </div>
              </div>

              {isCodeVerified && (
                <div className="glass-card mb-4" style={{ padding: '12px 16px', background: 'var(--success-bg)', borderColor: 'var(--success-border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="bi bi-patch-check-fill"></i> Apartment Found
                  </div>
                  <div style={{ fontSize: '14px', marginTop: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {form.apartment_name}
                  </div>
                </div>
              )}
            </form>

            <button onClick={handleStep4Continue} className="btn btn-accent btn-w-full" disabled={!isCodeVerified}>
              Continue <i className="bi bi-arrow-right-short" style={{ fontSize: '18px', marginLeft: '4px' }}></i>
            </button>
          </div>
        )}

        {/* STEP 5: FLAT NUMBER */}
        {step === 5 && (
          <div className="glass-card auth-card wizard-card" style={{ maxWidth: 480 }}>
            <button onClick={() => { setStep(4); setAlert(null); }} className="auth-back-home" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <i className="bi bi-arrow-left"></i> Back
            </button>
            <div className="text-center mb-3">
              <div className="auth-icon-badge" style={{ color: 'var(--primary)', background: 'var(--primary-bg)' }}>
                <i className="bi bi-house"></i>
              </div>
            </div>
            
            <span className="wizard-step-label">Step 5 of 5</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>

            <h2>Flat Information</h2>
            <p className="auth-subtitle">Step 5: Provide your household location</p>

            <Alert message={alert?.message} type={alert?.type} onDismiss={() => setAlert(null)} />

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="mb-4">
                <label className="form-label">Flat Number</label>
                <input type="text" className="form-control" name="house_number" required
                  placeholder="e.g. A101 or B203" value={form.house_number} onChange={handleChange} />
                <div className="form-text" style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Enter your block/door flat details inside <strong>{form.apartment_name}</strong>.
                </div>
              </div>
              
              <button type="submit" className="btn btn-accent btn-w-full" disabled={loading || !form.house_number.trim()}>
                {loading ? <><InlineSpinner /> Registering...</> : <><i className="bi bi-person-plus"></i> Register</>}
              </button>
            </form>
          </div>
        )}

        {/* STEP PENDING APPROVAL SCREEN */}
        {step === 'pending_approval' && (
          <div className="glass-card auth-card wizard-card text-center" style={{ maxWidth: 500, padding: '40px 32px' }}>
            <div className="mb-4 d-flex justify-content-center" style={{ display: 'flex', justifyContent: 'center' }}>
              <ApartEaseLogo size="lg" showText={true} />
            </div>
            
            <div className="section-divider" style={{ margin: '16px 0 24px' }}></div>

            <div className="auth-icon-badge" style={{ color: 'var(--warning)', background: 'var(--warning-bg)', width: '64px', height: '64px', fontSize: '28px', marginBottom: '20px' }}>
              <i className="bi bi-hourglass-split"></i>
            </div>

            <h2 style={{ fontSize: '21px', fontWeight: 800 }}>Registration Submitted Successfully</h2>
            
            <div className="waiting-status-card">
              <p className="waiting-subtitle">
                Your registration has been submitted successfully.
              </p>
              <p className="waiting-subtitle" style={{ marginTop: '10px', color: 'var(--text-primary)', fontWeight: 500 }}>
                Your account is currently awaiting administrator approval.
              </p>
              <p className="waiting-subtitle" style={{ marginTop: '10px', fontSize: '13.5px', color: 'var(--text-muted)' }}>
                You will be able to log in once your apartment administrator verifies your registration.
              </p>
            </div>

            <div className="section-divider" style={{ margin: '28px 0 20px' }}></div>

            <div className="d-flex justify-content-center gap-3" style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <Link to="/resident/login" className="btn btn-accent" style={{ padding: '8px 20px', fontSize: '13px' }}>
                <i className="bi bi-box-arrow-in-right"></i> Back to Login
              </Link>
              <button onClick={handleStartOver} className="btn btn-outline-accent" style={{ padding: '8px 20px', fontSize: '13px' }}>
                <i className="bi bi-arrow-counterclockwise"></i> Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
