/**
 * PieChart.jsx
 * ------------
 * Reusable pie/doughnut chart wrapper using react-chartjs-2.
 * Used for category breakdown.
 */

import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTheme } from '../../hooks/useTheme';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
  '#4f46e5', '#16a34a', '#d97706', '#dc2626', '#0284c7',
  '#7c3aed', '#db2777', '#059669', '#ca8a04', '#0891b2',
];

export default function PieChart({ labels, data }) {
  const { isDark } = useTheme();

  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: COLORS.slice(0, labels.length),
        borderWidth: 2,
        borderColor: isDark ? '#1e293b' : '#ffffff',
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: isDark ? '#cbd5e1' : '#475569',
          font: { family: 'Inter', size: 12 },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (ctx) => `${ctx.label}: ₹${ctx.raw.toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div className="chart-container" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '340px' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
