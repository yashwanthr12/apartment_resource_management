/**
 * BarChart.jsx
 * ------------
 * Reusable bar chart wrapper using react-chartjs-2.
 * Used for monthly expenditure comparison.
 */

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTheme } from '../../hooks/useTheme';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function BarChart({ labels, data, label = 'Amount (₹)' }) {
  const { isDark } = useTheme();
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  const chartData = {
    labels,
    datasets: [
      {
        label,
        data,
        backgroundColor: isDark ? 'rgba(129, 140, 248, 0.7)' : 'rgba(79, 70, 229, 0.7)',
        borderColor: isDark ? '#818cf8' : '#4f46e5',
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 40,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 10,
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { family: 'Inter', size: 11 },
          callback: (v) => '₹' + v.toLocaleString(),
        },
      },
    },
  };

  return (
    <div className="chart-container" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '340px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
