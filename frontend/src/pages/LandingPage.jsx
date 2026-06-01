/**
 * LandingPage.jsx
 * ----------------
 * Public welcome / landing page for ApartEase.
 * Provides navigation to Admin and Resident login/register flows.
 * Uses the existing design system (CSS variables, Inter font, project palette).
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LandingNavbar from '../components/layout/LandingNavbar';
import { ApartEaseLogo, Alert } from '../components/ui';

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deactAlert, setDeactAlert] = useState(null);

  // Read deactivation warning from navigation state
  useEffect(() => {
    if (location.state?.deactivationWarning) {
      setDeactAlert(location.state.deactivationWarning);
      // Clear history state to prevent showing on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    document.title = 'ApartEase – Apartment Resource Management & Billing System';
  }, []);


  /**
   * When arriving from an auth page via "/#section", scroll to the
   * target section after the page mounts.
   */
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      // Small delay to let the DOM render before scrolling
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location.hash]);

  const features = [
    { icon: 'bi-cash-stack',       title: 'Expense Management',      desc: 'Track and categorize all apartment expenditures with detailed breakdowns per billing period.' },
    { icon: 'bi-file-earmark-text',title: 'Bill Generation',         desc: 'Automatically split expenses across households and generate individual bills in seconds.' },
    { icon: 'bi-credit-card-2-front', title: 'Payment Tracking',     desc: 'Monitor payment statuses, upload receipts, and maintain a complete audit trail.' },
    { icon: 'bi-person-check',     title: 'Resident Verification',   desc: 'Approve or reject resident registrations with a streamlined verification workflow.' },
    { icon: 'bi-envelope-check',   title: 'Email Notifications',     desc: 'Residents receive instant email alerts when new bills are generated and sent.' },
    { icon: 'bi-bar-chart-line',   title: 'Analytics Dashboard',     desc: 'Visualize spending trends, category breakdowns, and usage patterns with interactive charts.' },
  ];

  const steps = [
    { num: '01', title: 'Add Expenditures',    desc: 'Admin records apartment expenses with category, amount, and billing period.' },
    { num: '02', title: 'System Splits Bills',  desc: 'The platform calculates each household\'s fair share automatically.' },
    { num: '03', title: 'Bills Sent',           desc: 'Individual bills are delivered to residents via the dashboard and email.' },
    { num: '04', title: 'Residents Pay',        desc: 'Residents upload payment receipts directly through their dashboard.' },
    { num: '05', title: 'Admin Verifies',       desc: 'Admin reviews and approves or rejects each payment submission.' },
  ];

  return (
    <div className="landing-page">
      {/* ── Shared Navbar ── */}
      <LandingNavbar />

      {deactAlert && (
        <div className="landing-container" style={{ paddingTop: '80px', marginBottom: '-50px' }}>
          <Alert message={deactAlert} type="warning" onDismiss={() => setDeactAlert(null)} />
        </div>
      )}


      {/* ── Hero Section ── */}
      <section className="landing-hero">
        <div className="landing-container landing-hero-inner">
          <div className="landing-hero-text">
            <h2 className="landing-hero-heading">Smart Apartment Management Made Simple</h2>
            <p className="landing-hero-sub">
              Manage expenses, billing, and residents efficiently in one place.
              A transparent, centralized system built for modern apartment communities.
            </p>
            <div className="landing-hero-actions">
              <button className="btn btn-accent" onClick={() => navigate('/admin/register')}>
                <i className="bi bi-rocket-takeoff"></i> Get Started
              </button>
              <button className="btn btn-outline-accent" onClick={() => { const el = document.getElementById('features'); el && el.scrollIntoView({ behavior: 'smooth' }); }}>
                <i className="bi bi-grid-3x3-gap"></i> Explore Features
              </button>
            </div>
            <div className="landing-hero-roles">
              <button className="landing-role-chip" onClick={() => navigate('/admin/login')}>
                <i className="bi bi-shield-lock"></i> Login as Admin
              </button>
              <button className="landing-role-chip" onClick={() => navigate('/resident/login')}>
                <i className="bi bi-house-door"></i> Login as Resident
              </button>
              <button className="landing-role-chip" onClick={() => navigate('/admin/register')}>
                <i className="bi bi-person-plus"></i> Register as Admin
              </button>
              <button className="landing-role-chip" onClick={() => navigate('/resident/register')}>
                <i className="bi bi-person-plus"></i> Register as Resident
              </button>
            </div>
          </div>
          <div className="landing-hero-visual">
            <div className="landing-hero-card">
              <div className="landing-mock-header">
                <span className="landing-mock-dot" style={{ background: '#ef4444' }}></span>
                <span className="landing-mock-dot" style={{ background: '#f59e0b' }}></span>
                <span className="landing-mock-dot" style={{ background: '#22c55e' }}></span>
              </div>
              <div className="landing-mock-body" style={{ background: '#f8fafc', overflow: 'hidden', position: 'relative' }}>
                <svg
                  viewBox="0 0 420 320"
                  width="100%"
                  height="100%"
                  style={{ display: 'block' }}
                >
                  <style>{`
                    @keyframes floatUp {
                      0% { transform: translateY(0px); }
                      50% { transform: translateY(-5px); }
                      100% { transform: translateY(0px); }
                    }
                    @keyframes floatDown {
                      0% { transform: translateY(0px); }
                      50% { transform: translateY(5px); }
                      100% { transform: translateY(0px); }
                    }
                    @keyframes pulseGlow {
                      0% { opacity: 0.4; }
                      50% { opacity: 0.95; }
                      100% { opacity: 0.4; }
                    }
                    .float-card-1 {
                      animation: floatUp 6s ease-in-out infinite;
                    }
                    .float-card-2 {
                      animation: floatDown 7s ease-in-out infinite;
                    }
                    .float-card-3 {
                      animation: floatUp 5s ease-in-out infinite;
                    }
                    .window-glow {
                      animation: pulseGlow 4s ease-in-out infinite;
                    }
                    .building-window:hover {
                      fill: #818cf8 !important;
                      transition: fill 0.3s ease;
                    }
                    .floating-card-item {
                      transition: transform 0.3s ease;
                      cursor: pointer;
                    }
                    .floating-card-item:hover {
                      transform: scale(1.04) translateY(-4px) !important;
                    }
                  `}</style>
                  
                  <defs>
                    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f8fafc" />
                      <stop offset="100%" stopColor="#e2e8f0" />
                    </linearGradient>
                    <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
                    </linearGradient>
                    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                    </linearGradient>
                    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.08" />
                    </filter>
                  </defs>

                  {/* Background Sky */}
                  <rect width="420" height="320" fill="url(#skyGrad)" />
                  <circle cx="80" cy="80" r="160" fill="url(#sunGrad)" />

                  {/* Distant Hills */}
                  <path d="M 0 280 Q 120 255 240 272 T 420 265 L 420 320 L 0 320 Z" fill="#cbd5e1" opacity="0.4" />

                  {/* Main Ground Base */}
                  <rect y="280" width="420" height="40" fill="#cbd5e1" />

                  {/* Soft Building Shadow */}
                  <ellipse cx="165" cy="282" rx="90" ry="5" fill="#0f172a" opacity="0.08" />

                  {/* Pathway */}
                  <path d="M 137.5 280 Q 220 280 320 305 L 350 305 Q 230 280 137.5 280 Z" fill="#cbd5e1" opacity="0.75" />
                  <path d="M 137.5 280 Q 220 280 320 305" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
                  <path d="M 137.5 280 Q 230 280 350 305" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />

                  {/* Left Tree */}
                  <g>
                    <line x1="45" y1="245" x2="45" y2="280" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="45" cy="225" r="22" fill="#4f46e5" />
                    <circle cx="58" cy="235" r="15" fill="#818cf8" />
                    <circle cx="34" cy="237" r="12" fill="#e0e7ff" />
                  </g>

                  {/* Right Tree */}
                  <g>
                    <line x1="265" y1="250" x2="265" y2="280" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="265" cy="235" r="16" fill="#818cf8" />
                    <circle cx="274" cy="242" r="11" fill="#e0e7ff" />
                  </g>

                  {/* Green Shrubbery */}
                  <g>
                    <rect x="80" y="274" width="22" height="8" rx="4" fill="#e0e7ff" />
                    <rect x="232" y="274" width="18" height="8" rx="4" fill="#cbd5e1" />
                    <rect x="165" y="276" width="28" height="6" rx="3" fill="#e0e7ff" />
                  </g>

                  {/* Modern Apartment Complex */}
                  {/* Left Block - Main Building */}
                  <rect x="90" y="70" width="95" height="210" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.8" />
                  
                  {/* Right Block - Balcony Tower */}
                  <rect x="185" y="90" width="50" height="190" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.8" />

                  {/* Purple Accent Column on Left */}
                  <rect x="84" y="65" width="6" height="215" rx="3" fill="#4f46e5" />

                  {/* Accent Dark Roof Awning */}
                  <rect x="78" y="64" width="162" height="5" rx="2.5" fill="#1e293b" />

                  {/* Modern elevator divider line */}
                  <rect x="182" y="70" width="3" height="210" fill="#e2e8f0" />

                  {/* Windows on Left Block */}
                  {/* 4th Floor Windows */}
                  <rect className="building-window" x="102" y="80" width="24" height="20" rx="3" fill="url(#glassGrad)" />
                  <line x1="114" y1="80" x2="114" y2="100" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />
                  <rect className="building-window" x="138" y="80" width="24" height="20" rx="3" fill="url(#glassGrad)" />
                  <line x1="150" y1="80" x2="150" y2="100" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />

                  {/* 3rd Floor Windows */}
                  <rect className="building-window window-glow" x="102" y="120" width="24" height="20" rx="3" fill="#f59e0b" />
                  <line x1="114" y1="120" x2="114" y2="140" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />
                  <rect className="building-window" x="138" y="120" width="24" height="20" rx="3" fill="url(#glassGrad)" />
                  <line x1="150" y1="120" x2="150" y2="140" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />

                  {/* 2nd Floor Windows */}
                  <rect className="building-window" x="102" y="160" width="24" height="20" rx="3" fill="url(#glassGrad)" />
                  <line x1="114" y1="160" x2="114" y2="180" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />
                  <rect className="building-window" x="138" y="160" width="24" height="20" rx="3" fill="url(#glassGrad)" />
                  <line x1="150" y1="160" x2="150" y2="180" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />

                  {/* 1st Floor Windows */}
                  <rect className="building-window" x="102" y="200" width="24" height="20" rx="3" fill="url(#glassGrad)" />
                  <line x1="114" y1="200" x2="114" y2="220" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />
                  <rect className="building-window" x="138" y="200" width="24" height="20" rx="3" fill="#e0e7ff" />
                  <line x1="150" y1="200" x2="150" y2="220" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />

                  {/* Balconies on Right Block */}
                  {/* Balcony 3 */}
                  <rect x="196" y="102" width="28" height="24" rx="2" fill="url(#glassGrad)" />
                  <line x1="210" y1="102" x2="210" y2="126" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />
                  <rect x="190" y="121" width="40" height="5" fill="#cbd5e1" />
                  <rect x="190" y="114" width="40" height="12" rx="1" fill="rgba(224, 231, 255, 0.4)" stroke="#818cf8" strokeWidth="0.8" />
                  <rect x="188" y="112" width="44" height="2" rx="1" fill="#4f46e5" />
                  <line x1="200" y1="114" x2="200" y2="126" stroke="#818cf8" strokeWidth="0.5" />
                  <line x1="210" y1="114" x2="210" y2="126" stroke="#818cf8" strokeWidth="0.5" />
                  <line x1="220" y1="114" x2="220" y2="126" stroke="#818cf8" strokeWidth="0.5" />

                  {/* Balcony 2 */}
                  <rect x="196" y="142" width="28" height="24" rx="2" fill="url(#glassGrad)" />
                  <line x1="210" y1="142" x2="210" y2="166" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />
                  <rect x="190" y="161" width="40" height="5" fill="#cbd5e1" />
                  <rect x="190" y="154" width="40" height="12" rx="1" fill="rgba(224, 231, 255, 0.4)" stroke="#818cf8" strokeWidth="0.8" />
                  <rect x="188" y="152" width="44" height="2" rx="1" fill="#4f46e5" />
                  <line x1="200" y1="154" x2="200" y2="166" stroke="#818cf8" strokeWidth="0.5" />
                  <line x1="210" y1="154" x2="210" y2="166" stroke="#818cf8" strokeWidth="0.5" />
                  <line x1="220" y1="154" x2="220" y2="166" stroke="#818cf8" strokeWidth="0.5" />

                  {/* Balcony 1 */}
                  <rect x="196" y="182" width="28" height="24" rx="2" fill="url(#glassGrad)" />
                  <line x1="210" y1="182" x2="210" y2="206" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />
                  <rect x="190" y="201" width="40" height="5" fill="#cbd5e1" />
                  <rect x="190" y="194" width="40" height="12" rx="1" fill="rgba(224, 231, 255, 0.4)" stroke="#818cf8" strokeWidth="0.8" />
                  <rect x="188" y="192" width="44" height="2" rx="1" fill="#4f46e5" />
                  <line x1="200" y1="194" x2="200" y2="206" stroke="#818cf8" strokeWidth="0.5" />
                  <line x1="210" y1="194" x2="210" y2="206" stroke="#818cf8" strokeWidth="0.5" />
                  <line x1="220" y1="194" x2="220" y2="206" stroke="#818cf8" strokeWidth="0.5" />

                  {/* Balcony Ground (sliding door only) */}
                  <rect x="196" y="222" width="28" height="24" rx="2" fill="url(#glassGrad)" />
                  <line x1="210" y1="222" x2="210" y2="246" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />
                  <rect x="190" y="241" width="40" height="5" fill="#cbd5e1" />
                  <rect x="190" y="234" width="40" height="12" rx="1" fill="rgba(224, 231, 255, 0.4)" stroke="#818cf8" strokeWidth="0.8" />
                  <rect x="188" y="232" width="44" height="2" rx="1" fill="#4f46e5" />
                  <line x1="200" y1="234" x2="200" y2="246" stroke="#818cf8" strokeWidth="0.5" />
                  <line x1="210" y1="234" x2="210" y2="246" stroke="#818cf8" strokeWidth="0.5" />
                  <line x1="220" y1="234" x2="220" y2="246" stroke="#818cf8" strokeWidth="0.5" />

                  {/* Lobby Glass Entrance */}
                  <rect x="115" y="240" width="45" height="40" rx="2" fill="url(#glassGrad)" stroke="#cbd5e1" strokeWidth="0.8" />
                  <line x1="137.5" y1="240" x2="137.5" y2="280" stroke="#cbd5e1" strokeWidth="0.8" />
                  <rect x="134" y="258" width="1.5" height="6" rx="0.5" fill="#4f46e5" />
                  <rect x="139" y="258" width="1.5" height="6" rx="0.5" fill="#4f46e5" />

                  {/* Lobby Canopy */}
                  <rect x="105" y="236" width="65" height="4" rx="2" fill="#4f46e5" />
                  <line x1="108" y1="240" x2="105" y2="244" stroke="#475569" strokeWidth="1" />
                  <line x1="167" y1="240" x2="170" y2="244" stroke="#475569" strokeWidth="1" />
                  
                  {/* Lobby hanging light inside */}
                  <line x1="137.5" y1="240" x2="137.5" y2="247" stroke="#475569" strokeWidth="0.8" />
                  <circle cx="137.5" cy="248" r="2" fill="#f59e0b" />

                  {/* Modern Gate Pillar */}
                  <rect x="290" y="255" width="8" height="25" rx="1.5" fill="#475569" />
                  <rect x="288" y="253" width="12" height="2" rx="0.5" fill="#1e293b" />
                  <rect x="293" y="258" width="2" height="4" rx="0.5" fill="#16a34a" />
                  <line x1="298" y1="272" x2="335" y2="272" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />

                  {/* ── SaaS Floating Cards ── */}
                  {/* Card 1: Bill Status Overlay */}
                  <g className="floating-card-item float-card-1">
                    <rect x="250" y="25" width="150" height="64" rx="8" fill="#ffffff" filter="url(#cardShadow)" stroke="#e0e7ff" strokeWidth="0.8" />
                    <rect x="262" y="36" width="40" height="12" rx="6" fill="#f0fdf4" />
                    <circle cx="268" cy="42" r="3" fill="#16a34a" />
                    <path d="M266.5,42 L267.5,43 L269.5,40.5" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="274" y="45" fontSize="7" fontWeight="800" fill="#16a34a" fontFamily="Inter, sans-serif">PAID</text>
                    <text x="262" y="62" fontSize="9" fontWeight="700" fill="#0f172a" fontFamily="Inter, sans-serif">Unit 402 — Bill Split</text>
                    <text x="262" y="74" fontSize="7.5" fill="#64748b" fontFamily="Inter, sans-serif">{"Water & Maint: $142.50"}</text>
                  </g>

                  {/* Card 2: Resource Tracker Overlay */}
                  <g className="floating-card-item float-card-2">
                    <rect x="265" y="110" width="140" height="66" rx="8" fill="#ffffff" filter="url(#cardShadow)" stroke="#e0e7ff" strokeWidth="0.8" />
                    <circle cx="279" cy="124" r="7" fill="#e0e7ff" />
                    <path d="M279,120 L280.5,123.5 L279,123.5 L279.8,128 L277.5,125 L279,125 Z" fill="#4f46e5" />
                    <text x="291" y="127" fontSize="8.5" fontWeight="700" fill="#0f172a" fontFamily="Inter, sans-serif">Electricity</text>
                    <text x="393" y="127" fontSize="7.5" fontWeight="700" fill="#16a34a" textAnchor="end" fontFamily="Inter, sans-serif">-12.4%</text>
                    <path d="M 277 164 Q 290 148 310 157 T 340 143 T 365 160 T 393 151 L 393 166 L 277 166 Z" fill="rgba(79, 70, 229, 0.04)" />
                    <path d="M 277 164 Q 290 148 310 157 T 340 143 T 365 160 T 393 151" fill="none" stroke="#4f46e5" strokeWidth="1.2" strokeLinecap="round" />
                  </g>

                  {/* Card 3: Resident Approval Status */}
                  <g className="floating-card-item float-card-3">
                    <rect x="10" y="105" width="105" height="42" rx="8" fill="#ffffff" filter="url(#cardShadow)" stroke="#e2e8f0" strokeWidth="0.8" />
                    <circle cx="24" cy="126" r="8" fill="#e0e7ff" />
                    <circle cx="24" cy="123" r="2.5" fill="#4f46e5" />
                    <path d="M20,131 C20,128.5 21.8,127.5 24,127.5 C26.2,127.5 28,128.5 28,131 Z" fill="#4f46e5" />
                    <text x="36" y="124" fontSize="8" fontWeight="700" fill="#0f172a" fontFamily="Inter, sans-serif">Yashwanth R.</text>
                    <text x="36" y="133" fontSize="7.5" fontWeight="600" fill="#16a34a" fontFamily="Inter, sans-serif">✓ Verified</text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── About Section ── */}
      <section className="landing-section" id="about">
        <div className="landing-container">
          <div className="landing-section-label">About the System</div>
          <h3 className="landing-section-title">What is ApartEase?</h3>
          <p className="landing-section-desc" style={{ maxWidth: 720, margin: '0 auto 40px' }}>
            ApartEase is a comprehensive apartment resource management and billing system
            designed to eliminate manual billing errors and bring transparency to shared expenses.
            It serves two key user roles:
          </p>
          <div className="landing-about-grid">
            <div className="landing-about-card">
              <div className="landing-about-icon">
                <i className="bi bi-shield-check"></i>
              </div>
              <h4>For Administrators</h4>
              <p>
                Record expenditures, generate split bills, verify residents,
                track payments, configure payment methods, and analyze spending
                patterns through rich analytics dashboards.
              </p>
            </div>
            <div className="landing-about-card">
              <div className="landing-about-icon resident">
                <i className="bi bi-house-heart"></i>
              </div>
              <h4>For Residents</h4>
              <p>
                View personalized bills, upload payment receipts, track payment
                verification status, filter billing history by date, and access
                personal analytics to understand spending contributions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="landing-section landing-section-alt" id="features">
        <div className="landing-container">
          <div className="landing-section-label">Core Capabilities</div>
          <h3 className="landing-section-title">Everything You Need</h3>
          <p className="landing-section-desc">
            A complete toolkit for apartment expense management, from recording costs to verifying payments.
          </p>
          <div className="landing-features-grid">
            {features.map((f, i) => (
              <div className="landing-feature-card" key={i}>
                <div className="landing-feature-icon">
                  <i className={`bi ${f.icon}`}></i>
                </div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-section" id="how-it-works" style={{ overflow: 'hidden' }}>
        <div className="landing-container">
          
          <style dangerouslySetInnerHTML={{ __html: `
            .landing-how-wrapper {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 40px;
              width: 100%;
            }
            .landing-how-center {
              flex: 1;
              max-width: 520px;
              min-width: 300px;
              z-index: 10;
            }
            .landing-how-visual-left,
            .landing-how-visual-right {
              flex: 0 0 280px;
              width: 280px;
              max-width: 280px;
              display: flex;
              justify-content: center;
              align-items: center;
              transition: transform 0.3s ease;
            }
            .landing-how-visual-left:hover,
            .landing-how-visual-right:hover {
              transform: translateY(-6px);
            }
            @media (max-width: 1024px) {
              .landing-how-wrapper {
                flex-direction: column;
                gap: 48px;
                text-align: center;
              }
              .landing-how-visual-left {
                order: 1;
              }
              .landing-how-center {
                order: 2;
                width: 100%;
                max-width: 560px;
              }
              .landing-how-visual-right {
                order: 3;
              }
            }
          `}} />

          <div className="landing-how-wrapper">
            
            {/* Left Side Visual: Modern Apartment block flat illustration */}
            <div className="landing-how-visual-left">
              <svg
                viewBox="0 0 280 340"
                width="100%"
                height="100%"
                style={{ display: 'block' }}
              >
                <style>{`
                  @keyframes pulseWindow {
                    0% { opacity: 0.3; }
                    50% { opacity: 0.9; }
                    100% { opacity: 0.3; }
                  }
                  .how-window-glow {
                    animation: pulseWindow 3.5s ease-in-out infinite;
                  }
                  .how-cloud {
                    animation: floatCloud 20s linear infinite;
                  }
                  @keyframes floatCloud {
                    0% { transform: translateX(0px); }
                    50% { transform: translateX(8px); }
                    100% { transform: translateX(0px); }
                  }
                `}</style>

                <defs>
                  <linearGradient id="howSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="100%" stopColor="#eef2ff" />
                  </linearGradient>
                  <linearGradient id="howGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
                  </linearGradient>
                  <filter id="cardShadow2" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.05" />
                  </filter>
                </defs>

                {/* Decorative Card Canvas */}
                <rect width="280" height="340" rx="16" fill="url(#howSkyGrad)" stroke="#e2e8f0" strokeWidth="0.8" />

                {/* Sun Light Source */}
                <circle cx="230" cy="70" r="40" fill="#4f46e5" fillOpacity="0.04" />
                <circle cx="230" cy="70" r="20" fill="#4f46e5" fillOpacity="0.02" />

                {/* Clouds */}
                <g className="how-cloud">
                  <path d="M 50 40 Q 60 30 70 40 Q 80 30 90 40 L 90 45 L 50 45 Z" fill="#ffffff" opacity="0.6" />
                  <path d="M 200 80 Q 208 72 216 80 Q 224 72 232 80 L 232 84 L 200 84 Z" fill="#ffffff" opacity="0.4" />
                </g>

                {/* Landscape Ground */}
                <path d="M 0 290 Q 90 280 180 292 T 280 288 L 280 340 L 0 340 Z" fill="#e2e8f0" opacity="0.7" />
                <rect y="295" width="280" height="45" fill="#cbd5e1" />

                {/* Soft shadows */}
                <ellipse cx="95" cy="297" rx="60" ry="4" fill="#0f172a" opacity="0.06" />

                {/* Main Tower (White block) */}
                <rect x="40" y="60" width="85" height="235" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.6" />

                {/* Recessed Tower Block */}
                <rect x="125" y="85" width="30" height="210" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.6" />

                {/* Building Side Accent Line */}
                <rect x="35" y="55" width="5" height="240" rx="2.5" fill="#4f46e5" />
                <rect x="29" y="54" width="131" height="4" rx="2" fill="#1e293b" />

                {/* Vertical elevator glass column */}
                <rect x="121" y="60" width="4" height="235" fill="#cbd5e1" />

                {/* Windows on Left Block */}
                {/* 5th Floor */}
                <rect x="50" y="74" width="16" height="14" rx="2" fill="url(#howGlassGrad)" />
                <rect x="74" y="74" width="16" height="14" rx="2" fill="url(#howGlassGrad)" />
                {/* 4th Floor */}
                <rect x="50" y="104" width="16" height="14" rx="2" fill="url(#howGlassGrad)" />
                <rect x="74" y="104" width="16" height="14" rx="2" fill="#f59e0b" className="how-window-glow" />
                {/* 3rd Floor */}
                <rect x="50" y="134" width="16" height="14" rx="2" fill="url(#howGlassGrad)" />
                <rect x="74" y="134" width="16" height="14" rx="2" fill="url(#howGlassGrad)" />
                {/* 2nd Floor */}
                <rect x="50" y="164" width="16" height="14" rx="2" fill="#e0e7ff" />
                <rect x="74" y="164" width="16" height="14" rx="2" fill="url(#howGlassGrad)" />
                {/* 1st Floor */}
                <rect x="50" y="194" width="16" height="14" rx="2" fill="url(#howGlassGrad)" />
                <rect x="74" y="194" width="16" height="14" rx="2" fill="url(#howGlassGrad)" />
                {/* Ground Lobby */}
                <rect x="62" y="255" width="26" height="40" rx="2" fill="url(#howGlassGrad)" stroke="#cbd5e1" strokeWidth="0.6" />
                <line x1="75" y1="255" x2="75" y2="295" stroke="#cbd5e1" strokeWidth="0.6" />

                {/* Recessed Block Windows */}
                <rect x="132" y="100" width="16" height="18" rx="1.5" fill="url(#howGlassGrad)" />
                <rect x="132" y="135" width="16" height="18" rx="1.5" fill="url(#howGlassGrad)" />
                <rect x="132" y="170" width="16" height="18" rx="1.5" fill="url(#howGlassGrad)" />
                <rect x="132" y="205" width="16" height="18" rx="1.5" fill="url(#howGlassGrad)" />

                {/* Landscaping */}
                {/* Tree */}
                <g>
                  <line x1="185" y1="265" x2="185" y2="295" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="185" cy="250" r="15" fill="#4f46e5" />
                  <circle cx="194" cy="257" r="10" fill="#818cf8" />
                  <circle cx="178" cy="258" r="8" fill="#e0e7ff" />
                </g>

                {/* Pathway */}
                <path d="M 75 295 Q 120 295 180 315 L 205 315 Q 130 295 75 295 Z" fill="#cbd5e1" opacity="0.6" />

                {/* Small Hedges */}
                <rect x="35" y="291" width="14" height="6" rx="3" fill="#cbd5e1" />
                <rect x="150" y="291" width="18" height="6" rx="3" fill="#e0e7ff" />

                {/* Floating Community Badge */}
                <g filter="url(#cardShadow2)">
                  <rect x="145" y="105" width="115" height="34" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
                  {/* Home Icon Badge */}
                  <circle cx="160" cy="122" r="8" fill="#e0e7ff" />
                  <path d="M157,123 L157,120 L160,117 L163,120 L163,123 Z" fill="#4f46e5" stroke="#4f46e5" strokeWidth="0.5" strokeLinecap="round" />
                  <rect x="159" y="121" width="2" height="2" fill="#ffffff" />
                  
                  <text x="173" y="120" fontSize="7.5" fontWeight="700" fill="#0f172a" fontFamily="Inter, sans-serif">ApartEase Town</text>
                  <text x="173" y="129" fontSize="6.5" fill="#16a34a" fontWeight="600" fontFamily="Inter, sans-serif">✓ 100% Verified</text>
                </g>
              </svg>
            </div>

            {/* Centered Workflow Steps */}
            <div className="landing-how-center">
              <div className="landing-section-label">Workflow</div>
              <h3 className="landing-section-title">How It Works</h3>
              <p className="landing-section-desc">
                A streamlined five-step process from expense entry to payment verification.
              </p>
              <div className="landing-steps">
                {steps.map((s, i) => (
                  <div className="landing-step" key={i}>
                    <div className="landing-step-num">{s.num}</div>
                    <div className="landing-step-content">
                      <h4>{s.title}</h4>
                      <p>{s.desc}</p>
                    </div>
                    {i < steps.length - 1 && <div className="landing-step-connector"></div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side Visual: Dashboard & Community / Smart Ecosystem SVG */}
            <div className="landing-how-visual-right">
              <svg
                viewBox="0 0 280 340"
                width="100%"
                height="100%"
                style={{ display: 'block' }}
              >
                <style>{`
                  @keyframes pulseNode {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                  }
                  .ecosystem-node {
                    transform-origin: center;
                    transition: transform 0.3s ease;
                  }
                  .ecosystem-node:hover {
                    transform: scale(1.12);
                    cursor: pointer;
                  }
                `}</style>

                <defs>
                  <linearGradient id="howSkyGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="100%" stopColor="#eef2ff" />
                  </linearGradient>
                  <linearGradient id="glassGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
                  </linearGradient>
                  <filter id="cardShadow2" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.05" />
                  </filter>
                </defs>

                {/* Decorative Card Canvas */}
                <rect width="280" height="340" rx="16" fill="url(#howSkyGrad2)" stroke="#e2e8f0" strokeWidth="0.8" />

                {/* Connected Dashboard Network Lines */}
                <path d="M 140 170 L 140 55" stroke="#4f46e5" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                <path d="M 140 170 L 45 150" stroke="#818cf8" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                <path d="M 140 170 L 235 150" stroke="#16a34a" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                <path d="M 140 170 L 140 285" stroke="#0284c7" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />

                {/* Central Building Block representing the community */}
                <g filter="url(#cardShadow2)">
                  <rect x="95" y="115" width="90" height="110" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
                  {/* Building details */}
                  <rect x="91" y="112" width="98" height="4" rx="2" fill="#1e293b" />
                  {/* Columns of windows */}
                  <rect x="105" y="125" width="16" height="14" rx="2" fill="url(#glassGrad2)" />
                  <rect x="105" y="150" width="16" height="14" rx="2" fill="url(#glassGrad2)" />
                  <rect x="105" y="175" width="16" height="14" rx="2" fill="url(#glassGrad2)" />
                  
                  <rect x="159" y="125" width="16" height="14" rx="2" fill="url(#glassGrad2)" />
                  <rect x="159" y="150" width="16" height="14" rx="2" fill="url(#glassGrad2)" />
                  <rect x="159" y="175" width="16" height="14" rx="2" fill="#cbd5e1" />
                  
                  {/* Lobby door */}
                  <rect x="127" y="200" width="26" height="25" rx="1.5" fill="url(#glassGrad2)" stroke="#e2e8f0" strokeWidth="0.5" />
                </g>

                {/* ── INTERCONNECTED ECOSYSTEM NODES ── */}

                {/* Top Node: Automated Billing / Splitting */}
                <g className="ecosystem-node" style={{ transformOrigin: '140px 55px' }}>
                  <circle cx="140" cy="55" r="18" fill="#ffffff" stroke="#4f46e5" strokeWidth="1.5" filter="url(#cardShadow2)" />
                  {/* Invoice Icon */}
                  <rect x="133" y="47" width="14" height="16" rx="1" fill="#ffffff" stroke="#4f46e5" strokeWidth="1" />
                  <line x1="136" y1="51" x2="144" y2="51" stroke="#4f46e5" strokeWidth="0.8" />
                  <line x1="136" y1="55" x2="144" y2="55" stroke="#4f46e5" strokeWidth="0.8" />
                  <line x1="136" y1="59" x2="141" y2="59" stroke="#4f46e5" strokeWidth="0.8" />
                  <text x="140" y="83" fontSize="6.5" fontWeight="700" fill="#4f46e5" textAnchor="middle" fontFamily="Inter, sans-serif">Auto Billing</text>
                </g>

                {/* Left Node: Expense Tracking */}
                <g className="ecosystem-node" style={{ transformOrigin: '45px 150px' }}>
                  <circle cx="45" cy="150" r="18" fill="#ffffff" stroke="#818cf8" strokeWidth="1.5" filter="url(#cardShadow2)" />
                  {/* Cash Stack Icon */}
                  <rect x="36" y="145" width="18" height="10" rx="1" fill="#ffffff" stroke="#818cf8" strokeWidth="1" />
                  <circle cx="45" cy="150" r="2.2" fill="#818cf8" />
                  <line x1="39" y1="150" x2="41" y2="150" stroke="#818cf8" strokeWidth="0.8" />
                  <line x1="49" y1="150" x2="51" y2="150" stroke="#818cf8" strokeWidth="0.8" />
                  <text x="45" y="178" fontSize="6.5" fontWeight="700" fill="#475569" textAnchor="middle" fontFamily="Inter, sans-serif">Expense Tracker</text>
                </g>

                {/* Right Node: Verified Payments */}
                <g className="ecosystem-node" style={{ transformOrigin: '235px 150px' }}>
                  <circle cx="235" cy="150" r="18" fill="#ffffff" stroke="#16a34a" strokeWidth="1.5" filter="url(#cardShadow2)" />
                  {/* Payment Card / Check Icon */}
                  <rect x="226" y="144" width="18" height="12" rx="1" fill="#ffffff" stroke="#16a34a" strokeWidth="1" />
                  <line x1="226" y1="148" x2="244" y2="148" stroke="#16a34a" strokeWidth="0.8" />
                  <circle cx="239" cy="152" r="2" fill="#16a34a" />
                  <text x="235" y="178" fontSize="6.5" fontWeight="700" fill="#16a34a" textAnchor="middle" fontFamily="Inter, sans-serif">Smart Payments</text>
                </g>

                {/* Bottom Node: Live Analytics */}
                <g className="ecosystem-node" style={{ transformOrigin: '140px 285px' }}>
                  <circle cx="140" cy="285" r="18" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" filter="url(#cardShadow2)" />
                  {/* Bar Chart Icon */}
                  <line x1="132" y1="291" x2="132" y2="293" stroke="#0284c7" strokeWidth="0.8" />
                  <line x1="132" y1="293" x2="148" y2="293" stroke="#0284c7" strokeWidth="0.8" />
                  <rect x="135" y="284" width="2.5" height="8" fill="#0284c7" rx="0.5" />
                  <rect x="139" y="281" width="2.5" height="11" fill="#0284c7" rx="0.5" />
                  <rect x="143" y="277" width="2.5" height="15" fill="#0284c7" rx="0.5" />
                  <text x="140" y="313" fontSize="6.5" fontWeight="700" fill="#0284c7" textAnchor="middle" fontFamily="Inter, sans-serif">Real-time Analytics</text>
                </g>
              </svg>
            </div>

          </div>
        </div>
      </section>

      {/* ── Use Cases + Problem Solving ── */}
      <section className="landing-section landing-section-alt" id="use-cases">
        <div className="landing-container">
          <div className="landing-two-col">
            <div>
              <div className="landing-section-label" style={{ textAlign: 'left' }}>Use Cases</div>
              <h3 className="landing-section-title" style={{ textAlign: 'left' }}>Built For</h3>
              <ul className="landing-check-list">
                <li><i className="bi bi-check-circle-fill"></i> Apartment complex management</li>
                <li><i className="bi bi-check-circle-fill"></i> Housing society billing automation</li>
                <li><i className="bi bi-check-circle-fill"></i> Transparent expense tracking for shared spaces</li>
                <li><i className="bi bi-check-circle-fill"></i> Multi-tenant utility cost splitting</li>
              </ul>
            </div>
            <div>
              <div className="landing-section-label" style={{ textAlign: 'left' }}>Problems We Solve</div>
              <h3 className="landing-section-title" style={{ textAlign: 'left' }}>Why ApartEase</h3>
              <ul className="landing-check-list solve">
                <li><i className="bi bi-lightning-fill"></i> Eliminates manual billing errors and spreadsheet chaos</li>
                <li><i className="bi bi-lightning-fill"></i> Centralizes all expense data in one secure platform</li>
                <li><i className="bi bi-lightning-fill"></i> Real-time updates for both admins and residents</li>
                <li><i className="bi bi-lightning-fill"></i> Easy payment tracking with receipt upload and verification</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <div className="landing-container landing-cta-inner">
          <h3>Ready to simplify your apartment billing?</h3>
          <p>Create your admin account and start managing expenses in minutes.</p>
          <div className="landing-hero-actions" style={{ justifyContent: 'center' }}>
            <button className="btn btn-accent" onClick={() => navigate('/admin/register')}>
              <i className="bi bi-rocket-takeoff"></i> Get Started Free
            </button>
            <button className="btn btn-outline-accent" style={{ borderColor: '#fff', color: '#fff' }} onClick={() => navigate('/admin/login')}>
              <i className="bi bi-box-arrow-in-right"></i> Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-brand" style={{ display: 'inline-flex', justifyContent: 'center' }}>
            <ApartEaseLogo size="md" />
          </div>
          <p className="landing-footer-desc">
            A comprehensive apartment resource management and billing system
            for transparent, efficient community living.
          </p>
          <div className="landing-footer-bottom">
            <span>&copy; {new Date().getFullYear()} ApartEase. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
