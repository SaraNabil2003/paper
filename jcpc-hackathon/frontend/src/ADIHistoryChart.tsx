import React, { useState, useEffect } from 'react';
import './ADIHistoryChart.css';

const API_BASE = 'http://localhost:5000/api';

interface ADIHistoryPoint {
  id: number;
  user_id: number;
  adi_value: number;
  performance_with_ai: number;
  performance_without_ai: number;
  consultation_frequency: number;
  early_consultation_ratio: number;
  transfer_performance: number;
  recorded_at: string;
}

interface ADIHistoryChartProps {
  studentId: number;
  days?: number;
}

export function ADIHistoryChart({ studentId, days = 30 }: ADIHistoryChartProps) {
  const [history, setHistory] = useState<ADIHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMetric, setShowMetric] = useState<'adi' | 'performance' | 'consultation'>('adi');

  useEffect(() => {
    fetchHistory();
  }, [studentId, days]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/analytics/${studentId}`);
      const data = await response.json();

      if (data.adiHistory && data.adiHistory.length > 0) {
        setHistory(data.adiHistory);
      } else {
        // Generate mock history for demonstration if no data
        setHistory(generateMockHistory());
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch ADI history:', error);
      setHistory(generateMockHistory());
      setLoading(false);
    }
  };

  const generateMockHistory = (): ADIHistoryPoint[] => {
    const now = Date.now();
    const points: ADIHistoryPoint[] = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      points.push({
        id: i,
        user_id: studentId,
        adi_value: 3.5 + Math.random() * 2 - 1,
        performance_with_ai: 0.7 + Math.random() * 0.2,
        performance_without_ai: 0.5 + Math.random() * 0.2,
        consultation_frequency: 0.3 + Math.random() * 0.2,
        early_consultation_ratio: 0.2 + Math.random() * 0.2,
        transfer_performance: 0.6 + Math.random() * 0.2,
        recorded_at: date.toISOString()
      });
    }

    return points;
  };

  const getADIZoneColor = (adi: number): string => {
    if (adi < 2.5) return '#4caf50';
    if (adi < 5.0) return '#ff9800';
    if (adi < 7.5) return '#ff5722';
    return '#d32f2f';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const renderLineChart = () => {
    if (history.length === 0) {
      return <div className="no-data">No historical data available</div>;
    }

    const width = 700;
    const height = 300;
    const padding = 40;

    let dataPoints: number[];
    let label: string;
    let color: string;

    if (showMetric === 'adi') {
      dataPoints = history.map(h => h.adi_value);
      label = 'ADI';
      color = '#1976d2';
    } else if (showMetric === 'performance') {
      dataPoints = history.map(h => h.performance_with_ai - h.performance_without_ai);
      label = 'Performance Gap';
      color = '#9c27b0';
    } else {
      dataPoints = history.map(h => h.consultation_frequency);
      label = 'Consultation Frequency';
      color = '#ff9800';
    }

    const maxValue = Math.max(...dataPoints, showMetric === 'adi' ? 10 : 1);
    const minValue = Math.min(...dataPoints, 0);
    const range = maxValue - minValue;

    const points = dataPoints.map((value, index) => {
      const x = padding + (index / (dataPoints.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
      return { x, y, value, date: history[index].recorded_at };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Grid lines for ADI zones (if showing ADI)
    const gridLines = showMetric === 'adi' ? [
      { value: 2.5, label: 'Healthy', color: '#4caf50' },
      { value: 5.0, label: 'Moderate', color: '#ff9800' },
      { value: 7.5, label: 'High', color: '#ff5722' }
    ] : [];

    return (
      <svg width={width} height={height} className="chart-svg">
        {/* Background zones for ADI */}
        {showMetric === 'adi' && (
          <>
            <rect
              x={padding}
              y={height - padding - ((2.5 - minValue) / range) * (height - 2 * padding)}
              width={width - 2 * padding}
              height={((2.5 - minValue) / range) * (height - 2 * padding)}
              fill="#4caf50"
              opacity="0.1"
            />
            <rect
              x={padding}
              y={height - padding - ((5.0 - minValue) / range) * (height - 2 * padding)}
              width={width - 2 * padding}
              height={((2.5) / range) * (height - 2 * padding)}
              fill="#ff9800"
              opacity="0.1"
            />
            <rect
              x={padding}
              y={height - padding - ((7.5 - minValue) / range) * (height - 2 * padding)}
              width={width - 2 * padding}
              height={((2.5) / range) * (height - 2 * padding)}
              fill="#ff5722"
              opacity="0.1"
            />
          </>
        )}

        {/* Grid lines */}
        {gridLines.map((line, i) => {
          const y = height - padding - ((line.value - minValue) / range) * (height - 2 * padding);
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke={line.color}
                strokeWidth="1"
                strokeDasharray="5,5"
                opacity="0.5"
              />
              <text x={width - padding + 5} y={y + 4} fontSize="10" fill={line.color}>
                {line.value}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#666"
          strokeWidth="2"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#666"
          strokeWidth="2"
        />

        {/* Data line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="3"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="5"
              fill={showMetric === 'adi' ? getADIZoneColor(p.value) : color}
              stroke="white"
              strokeWidth="2"
            />
            {i % Math.ceil(points.length / 7) === 0 && (
              <text
                x={p.x}
                y={height - padding + 20}
                fontSize="10"
                textAnchor="middle"
                fill="#666"
              >
                {formatDate(p.date)}
              </text>
            )}
          </g>
        ))}

        {/* Y-axis label */}
        <text
          x={15}
          y={height / 2}
          fontSize="12"
          textAnchor="middle"
          transform={`rotate(-90, 15, ${height / 2})`}
          fill="#666"
        >
          {label}
        </text>
      </svg>
    );
  };

  if (loading) {
    return <div className="adi-history-chart loading">Loading history...</div>;
  }

  return (
    <div className="adi-history-chart">
      <div className="chart-header">
        <h3>ADI & Performance Trends ({days} days)</h3>
        <div className="metric-selector">
          <button
            className={showMetric === 'adi' ? 'active' : ''}
            onClick={() => setShowMetric('adi')}
          >
            ADI
          </button>
          <button
            className={showMetric === 'performance' ? 'active' : ''}
            onClick={() => setShowMetric('performance')}
          >
            Performance Gap
          </button>
          <button
            className={showMetric === 'consultation' ? 'active' : ''}
            onClick={() => setShowMetric('consultation')}
          >
            Consultation
          </button>
        </div>
      </div>

      <div className="chart-container">
        {renderLineChart()}
      </div>

      {history.length > 0 && (
        <div className="chart-summary">
          <div className="summary-stat">
            <span className="label">Latest ADI:</span>
            <span className="value" style={{ color: getADIZoneColor(history[history.length - 1].adi_value) }}>
              {history[history.length - 1].adi_value.toFixed(2)}
            </span>
          </div>
          <div className="summary-stat">
            <span className="label">Average ADI:</span>
            <span className="value">
              {(history.reduce((sum, h) => sum + h.adi_value, 0) / history.length).toFixed(2)}
            </span>
          </div>
          <div className="summary-stat">
            <span className="label">Trend:</span>
            <span className="value">
              {history[history.length - 1].adi_value < history[0].adi_value ? '📉 Improving' : '📈 Increasing'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
