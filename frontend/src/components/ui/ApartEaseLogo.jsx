/**
 * ApartEaseLogo.jsx
 * ----------------
 * Premium, high-quality vector brand logo component for ApartEase.
 * Combines a modern apartment building tower and a smart billing check ledger
 * inside a rounded-corner purple gradient application badge.
 *
 * Props:
 *  - size      ('sm' | 'md' | 'lg' | 'xl')   Preset sizes (sm = Navbar, xl = Hero)
 *  - showText  (bool)                        Whether to display the brand name and tagline
 *  - alignment ('horizontal' | 'vertical')   Visual orientation
 *  - style     (object)                      Custom inline styles
 */

export default function ApartEaseLogo({
  size = 'md',
  showText = true,
  alignment = 'horizontal',
  style = {}
}) {
  // Size presets mapping
  const presets = {
    sm: { icon: 42, font: '19px', tag: '10.5px', gap: '10px' },
    md: { icon: 52, font: '22px', tag: '12px', gap: '12px' },
    lg: { icon: 60, font: '25px', tag: '13px', gap: '14px' },
    xl: { icon: 80, font: '29px', tag: '14px', gap: '16px' }
  };

  const current = presets[size] || presets.md;
  const isVertical = alignment === 'vertical' || size === 'xl';

  return (
    <div
      className={`apartease-brand-logo size-${size}`}
      style={{
        display: 'inline-flex',
        flexDirection: isVertical ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: isVertical ? 'center' : 'flex-start',
        gap: current.gap,
        cursor: 'pointer',
        userSelect: 'none',
        textAlign: isVertical ? 'center' : 'left',
        ...style
      }}
    >
      {/* ── Premium Vector Logo Icon (SVG) ── */}
      <svg
        width={current.icon}
        height={current.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, display: 'block' }}
      >
        <defs>
          {/* Logo Badge Background Gradient */}
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          {/* Subtle drop shadow under the floating check card */}
          <filter id="logoCardShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* 1. Rounded Square App Badge */}
        <rect width="48" height="48" rx="13" fill="url(#logoBgGrad)" />

        {/* 2. Sleek Modern Apartment Tower (White) */}
        {/* Left Block (Main Tower) */}
        <rect x="11" y="11" width="16" height="26" rx="2" fill="#ffffff" />
        {/* Right Block (Recessed Section) */}
        <rect x="25" y="17" width="11" height="20" rx="1.5" fill="#e0e7ff" fillOpacity="0.9" />

        {/* Modern Window Cutouts */}
        {/* Left block windows */}
        <rect x="14" y="15" width="3" height="4" rx="0.5" fill="#4f46e5" fillOpacity="0.25" />
        <rect x="20" y="15" width="3" height="4" rx="0.5" fill="#4f46e5" fillOpacity="0.25" />
        <rect x="14" y="21" width="3" height="4" rx="0.5" fill="#4f46e5" fillOpacity="0.25" />
        <rect x="20" y="21" width="3" height="4" rx="0.5" fill="#4f46e5" fillOpacity="0.25" />
        <rect x="14" y="27" width="3" height="4" rx="0.5" fill="#4f46e5" fillOpacity="0.25" />
        <rect x="20" y="27" width="3" height="4" rx="0.5" fill="#4f46e5" fillOpacity="0.25" />

        {/* Right block windows */}
        <rect x="29" y="21" width="3" height="4" rx="0.5" fill="#4f46e5" fillOpacity="0.2" />
        <rect x="29" y="27" width="3" height="4" rx="0.5" fill="#4f46e5" fillOpacity="0.2" />

        {/* Roof line shadow block */}
        <rect x="11" y="9" width="25" height="2" rx="1" fill="#1e293b" />

        {/* 3. Overlapping Smart Billing Document Card */}
        <g filter="url(#logoCardShadow)">
          <rect x="23" y="23" width="16" height="16" rx="4.5" fill="#ffffff" stroke="#e0e7ff" strokeWidth="0.8" />
          
          {/* Document Line Details */}
          <line x1="27" y1="27" x2="35" y2="27" stroke="#818cf8" strokeWidth="1" strokeLinecap="round" />
          <line x1="27" y1="30" x2="32" y2="30" stroke="#818cf8" strokeWidth="1" strokeLinecap="round" />
          
          {/* Success Checkmark Icon (Represents Verified Billing / Payment) */}
          <path
            d="M 28 35.5 L 30 37.5 L 35 32.5"
            fill="none"
            stroke="#16a34a"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      {/* ── Wordmark & Tagline ── */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isVertical ? 'center' : 'flex-start', justifyContent: 'center' }}>
          <h1
            style={{
              fontSize: current.font,
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1.15,
              letterSpacing: '-0.6px',
              margin: 0,
              fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif"
            }}
          >
            ApartEase
          </h1>
          <span
            style={{
              fontSize: current.tag,
              fontWeight: 500,
              color: 'var(--text-muted)',
              lineHeight: 1.2,
              letterSpacing: '0.2px',
              margin: '3px 0 0 0',
              fontFamily: "'Inter', -apple-system, sans-serif"
            }}
          >
            Simple living. Smart billing.
          </span>
        </div>
      )}
    </div>
  );
}
