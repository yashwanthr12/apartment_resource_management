/**
 * AdminDashboard.jsx
 * ------------------
 * Main admin dashboard with stats, charts, quick actions, and recent bills.
 * Uses polling for real-time sync (15s interval).
 */

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { StatCard, GlassCard, EmptyState } from '../../components/ui';
import BarChart from '../../components/charts/BarChart';
import PieChart from '../../components/charts/PieChart';
import { useAuth } from '../../hooks/useAuth';
import { usePolling } from '../../hooks/usePolling';
import { getDashboardStats } from '../../services/adminService';
import { getComparison, getMonthlyBreakdown } from '../../services/analyticsService';
import { formatCurrency } from '../../utils/format';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [barData, setBarData] = useState(null);
  const [pieData, setPieData] = useState(null);

  // Fetch all dashboard data — called on mount and every 15s
  const fetchDashboard = useCallback(async () => {
    const [statsRes, barRes, pieRes] = await Promise.all([
      getDashboardStats(),
      getComparison(),
      getMonthlyBreakdown(),
    ]);

    if (statsRes.ok) setStats(statsRes.data);
    if (barRes.ok) setBarData(barRes.data);
    if (pieRes.ok) setPieData(pieRes.data);
  }, []);

  // Poll every 15 seconds for real-time sync
  usePolling(fetchDashboard, 15000);

  return (
    <DashboardLayout title="Dashboard" subtitle={`Welcome back, ${user?.name || 'Admin'}`}>
      {/* ── Stat Cards ── */}
      <div className="stats-grid mb-4">
        <StatCard icon="bi-people-fill" iconColor="purple"
          value={stats?.total_residents ?? '—'} label="Total Residents" />
        <StatCard icon="bi-cash-stack" iconColor="green"
          value={stats ? formatCurrency(stats.total_expenses) : '—'} label="Total Expenses" />
        <StatCard icon="bi-file-earmark-text" iconColor="cyan"
          value={stats?.total_bills ?? '—'} label="Total Bills" />
        <StatCard icon="bi-hourglass-split" iconColor="orange"
          value={stats?.pending_payments ?? '—'} label="Pending Payments" />
        <StatCard icon="bi-check-circle" iconColor="green"
          value={stats?.paid_payments ?? '—'} label="Verified Payments" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-dashboard-flex-row {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          margin-bottom: 24px;
          align-items: stretch;
        }
        .admin-col-50 {
          flex: 0 0 calc(50% - 16px);
          width: calc(50% - 16px);
          display: flex;
        }
        .admin-col-30 {
          flex: 0 0 calc(30% - 16px);
          width: calc(30% - 16px);
          display: flex;
        }
        .admin-col-20 {
          flex: 0 0 calc(20% - 16px);
          width: calc(20% - 16px);
          display: flex;
        }
        @media (max-width: 1199px) {
          .admin-col-50 {
            flex: 0 0 100%;
            width: 100%;
            max-width: 100%;
            margin-bottom: 8px;
          }
          .admin-col-30 {
            flex: 0 0 calc(60% - 12px);
            width: calc(60% - 12px);
          }
          .admin-col-20 {
            flex: 0 0 calc(40% - 12px);
            width: calc(40% - 12px);
          }
        }
        @media (max-width: 767px) {
          .admin-dashboard-flex-row {
            gap: 16px;
          }
          .admin-col-50, .admin-col-30, .admin-col-20 {
            flex: 0 0 100%;
            width: 100%;
            max-width: 100%;
            margin-bottom: 0;
          }
        }
      `}} />

      {/* ── Charts & Quick Actions Row (50% / 30% / 20%) ── */}
      <div className="admin-dashboard-flex-row">
        {/* Column 1: Monthly Expenditure (50%) */}
        <div className="admin-col-50">
          <GlassCard style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 24, margin: 0 }}>
            <h5 style={{ fontWeight: 700, marginBottom: 18, fontSize: '15px' }}>
              <i className="bi bi-bar-chart" style={{ marginRight: 8, color: 'var(--success)' }}></i>
              Monthly Expenditure
            </h5>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '340px' }}>
              {barData && barData.length > 0 ? (
                <BarChart
                  labels={barData.map(d => d.label)}
                  data={barData.map(d => d.total)}
                />
              ) : (
                <EmptyState icon="bi-bar-chart" message="No expenditure data yet" />
              )}
            </div>
          </GlassCard>
        </div>

        {/* Column 2: Category Breakdown (30%) */}
        <div className="admin-col-30">
          <GlassCard style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 24, margin: 0 }}>
            <h5 style={{ fontWeight: 700, marginBottom: 18, fontSize: '15px' }}>
              <i className="bi bi-pie-chart" style={{ marginRight: 8, color: 'var(--primary)' }}></i>
              Category Breakdown
            </h5>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '340px' }}>
              {pieData && pieData.length > 0 ? (
                <PieChart
                  labels={pieData.map(d => d.category)}
                  data={pieData.map(d => d.amount)}
                />
              ) : (
                <EmptyState icon="bi-pie-chart" message="No category data yet" />
              )}
            </div>
          </GlassCard>
        </div>

        {/* Column 3: Quick Actions (20%) */}
        <div className="admin-col-20">
          <GlassCard style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 20px', margin: 0, justifyContent: 'space-between' }}>
            <h5 style={{ fontWeight: 700, marginBottom: 18, fontSize: '15px' }}>
              <i className="bi bi-lightning-charge" style={{ marginRight: 8, color: 'var(--warning)' }}></i>
              Quick Actions
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
              <Link to="/admin/add-expense" className="btn btn-accent d-flex align-items-center justify-content-center gap-2" style={{ padding: '10px', fontSize: '12.5px', fontWeight: 600 }}>
                <i className="bi bi-plus-circle"></i> Expense Management
              </Link>
              <Link to="/admin/residents" className="btn btn-outline-accent d-flex align-items-center justify-content-center gap-2" style={{ padding: '10px', fontSize: '12.5px', fontWeight: 600 }}>
                <i className="bi bi-send"></i> Bill Distribution
              </Link>
              <Link to="/admin/payment-verification" className="btn btn-outline-accent d-flex align-items-center justify-content-center gap-2" style={{ padding: '10px', fontSize: '12.5px', fontWeight: 600 }}>
                <i className="bi bi-receipt-cutoff"></i> Payment Verification
              </Link>
              <Link to="/admin/analytics" className="btn btn-outline-accent d-flex align-items-center justify-content-center gap-2" style={{ padding: '10px', fontSize: '12.5px', fontWeight: 600 }}>
                <i className="bi bi-bar-chart-line"></i> Analytics Dashboard
              </Link>
              <Link to="/admin/residents-mgmt" className="btn btn-outline-accent d-flex align-items-center justify-content-center gap-2" style={{ padding: '10px', fontSize: '12.5px', fontWeight: 600 }}>
                <i className="bi bi-people"></i> Resident Management
              </Link>
              <Link to="/admin/payment-settings" className="btn btn-outline-accent d-flex align-items-center justify-content-center gap-2" style={{ padding: '10px', fontSize: '12.5px', fontWeight: 600 }}>
                <i className="bi bi-credit-card-2-front"></i> Billing Information
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
