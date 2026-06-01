/**
 * LandingNavbar.jsx
 * ------------------
 * Shared fixed navigation bar used on Landing, Login, and Signup pages.
 * On the Landing page the section links scroll smoothly.
 * On auth pages the section links navigate to "/" with a hash, and the
 * LandingPage handles scrolling to the target section on mount.
 * Includes a dark/light mode toggle button.
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { ApartEaseLogo } from '../ui';

export default function LandingNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  /** True when we are already on the landing page */
  const isLanding = location.pathname === '/';

  /**
   * Handle section-link clicks.
   * - On the landing page: smooth-scroll to the anchor.
   * - On any other page: navigate to "/#section" so the landing page
   *   can scroll to it after mount.
   */
  const handleSectionClick = (sectionId) => {
    setMenuOpen(false);
    if (isLanding) {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/#' + sectionId);
    }
  };

  /** Logo click: always go home and scroll to top */
  const handleLogoClick = () => {
    setMenuOpen(false);
    if (isLanding) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  return (
    <header className="landing-header">
      <div className="landing-container landing-header-inner">
        {/* ── Brand / Logo ── */}
        <div className="landing-brand" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <ApartEaseLogo size="sm" />
        </div>

        {/* ── Mobile toggle ── */}
        <button
          className="landing-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
        </button>

        {/* ── Nav links ── */}
        <nav className={`landing-nav ${menuOpen ? 'open' : ''}`}>
          <a href="#about"       onClick={(e) => { e.preventDefault(); handleSectionClick('about'); }}>About</a>
          <a href="#features"    onClick={(e) => { e.preventDefault(); handleSectionClick('features'); }}>Features</a>
          <a href="#how-it-works" onClick={(e) => { e.preventDefault(); handleSectionClick('how-it-works'); }}>How It Works</a>

          {/* Dark mode toggle */}
          <button
            className="landing-theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <i className={`bi ${isDark ? 'bi-sun-fill' : 'bi-moon-fill'}`}></i>
          </button>

          <div className="landing-nav-auth">
            <button className="btn btn-outline-accent btn-sm" onClick={() => { setMenuOpen(false); navigate('/admin/login'); }}>Log In</button>
            <button className="btn btn-accent btn-sm" onClick={() => { setMenuOpen(false); navigate('/admin/register'); }}>Sign Up</button>
          </div>
        </nav>
      </div>
    </header>
  );
}
