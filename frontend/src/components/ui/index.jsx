/**
 * UI Components — Reusable building blocks for the ApartmentMS React frontend.
 *
 * Exports: StatCard, GlassCard, Alert, Badge, Modal, Spinner, EmptyState
 */

import { useState, useEffect } from 'react';

// ── StatCard: Dashboard metric card with icon, value, label ──
export function StatCard({ icon, iconColor, value, label }) {
  return (
    <div className="glass-card stat-card">
      <div className={`stat-icon ${iconColor}`}>
        <i className={`bi ${icon}`}></i>
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── GlassCard: Container card with clean styling ──
export function GlassCard({ children, style, className = '' }) {
  return (
    <div className={`glass-card ${className}`} style={style}>
      {children}
    </div>
  );
}

// ── Alert: Toast notification with auto-dismiss ──
export function Alert({ message, type = 'danger', onDismiss, duration = 5000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  const icons = {
    success: 'bi-check-circle',
    danger: 'bi-exclamation-triangle',
    warning: 'bi-exclamation-circle',
    info: 'bi-info-circle',
  };

  return (
    <div className={`alert alert-${type}`}>
      <i className={`bi ${icons[type] || icons.danger}`}></i>
      {message}
    </div>
  );
}

// ── Badge: Status badge ──
export function StatusBadge({ status }) {
  const config = {
    pending:  { className: 'badge-pending',  icon: 'bi-hourglass-split', label: 'Pending' },
    paid:     { className: 'badge-paid',     icon: 'bi-check-circle',    label: 'Paid' },
    rejected: { className: 'badge-rejected', icon: 'bi-x-circle',       label: 'Rejected' },
    verified: { className: 'badge-verified', icon: 'bi-patch-check',    label: 'Verified' },
    no_payment: { className: 'badge-pending', icon: 'bi-clock',          label: 'No Payment' },
  };

  const c = config[status] || config.pending;

  return (
    <span className={`badge ${c.className}`}>
      <i className={`bi ${c.icon}`}></i>
      {c.label}
    </span>
  );
}

// ── Modal: Reusable modal with overlay ──
export function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h5>{title}</h5>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── Spinner: Full-page loading overlay ──
export function Spinner() {
  return (
    <div className="spinner-overlay">
      <div className="spinner-ring"></div>
    </div>
  );
}

// ── InlineSpinner: Small inline spinner ──
export function InlineSpinner() {
  return <span className="spinner-sm" style={{ marginRight: 8 }}></span>;
}

// ── EmptyState: "No data" placeholder ──
export function EmptyState({ icon = 'bi-inbox', message = 'No data yet' }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon}`}></i>
      <p>{message}</p>
    </div>
  );
}

// ── ApartEaseLogo: Premium startup-grade vector logo ──
export { default as ApartEaseLogo } from './ApartEaseLogo';
