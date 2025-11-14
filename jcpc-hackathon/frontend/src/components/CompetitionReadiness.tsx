/**
 * Competition Readiness Component
 * Tracks the three criteria from PSF paper (Section 3.4):
 * 1. 70%+ AI-restricted success rate
 * 2. ADI <3.0 sustained for 2 weeks
 * 3. 10+ full timed contests completed
 */

import React, { useState, useEffect } from 'react';
import './CompetitionReadiness.css';

interface ReadinessCriteria {
  criterion: string;
  description: string;
  threshold: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  met: boolean;
  progress: number; // 0-100
}

interface CompetitionReadinessProps {
  userId: number;
}

interface ReadinessData {
  overallReady: boolean;
  readinessScore: number; // 0-100
  criteria: ReadinessCriteria[];
  adiHistory: Array<{ date: string; value: number }>;
  contestHistory: Array<{ date: string; score: number; duration: number }>;
  recommendations: string[];
}

export function CompetitionReadiness({ userId }: CompetitionReadinessProps) {
  const [readinessData, setReadinessData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchReadinessData();
  }, [userId]);

  const fetchReadinessData = async () => {
    try {
      // TODO: Replace with actual API endpoint
      // const response = await fetch(`${API_BASE}/api/competition-readiness/${userId}`);
      // const data = await response.json();

      // Mock data for now
      const mockData: ReadinessData = {
        overallReady: false,
        readinessScore: 65,
        criteria: [
          {
            criterion: 'AI-Restricted Success Rate',
            description: 'Success rate on problems solved without AI assistance',
            threshold: '≥70%',
            currentValue: 68,
            targetValue: 70,
            unit: '%',
            met: false,
            progress: 97 // (68/70) * 100
          },
          {
            criterion: 'Sustained Low ADI',
            description: 'AI Dependency Index below 3.0 for consecutive 2 weeks',
            threshold: '<3.0 for 2 weeks',
            currentValue: 3.2,
            targetValue: 3.0,
            unit: '',
            met: false,
            progress: 94 // Close to meeting
          },
          {
            criterion: 'Timed Contests Completed',
            description: 'Full-length timed contests completed under competition conditions',
            threshold: '≥10 contests',
            currentValue: 7,
            targetValue: 10,
            unit: ' contests',
            met: false,
            progress: 70 // (7/10) * 100
          }
        ],
        adiHistory: [
          { date: '2025-11-01', value: 4.2 },
          { date: '2025-11-08', value: 3.5 },
          { date: '2025-11-15', value: 3.2 }
        ],
        contestHistory: [
          { date: '2025-11-02', score: 450, duration: 120 },
          { date: '2025-11-05', score: 520, duration: 150 },
          { date: '2025-11-09', score: 580, duration: 120 },
          { date: '2025-11-12', score: 610, duration: 180 },
          { date: '2025-11-16', score: 650, duration: 150 },
          { date: '2025-11-19', score: 690, duration: 120 },
          { date: '2025-11-23', score: 720, duration: 150 }
        ],
        recommendations: [
          'Complete 2-3 more AI-free problems to reach the 70% success threshold',
          'Maintain your current ADI level for one more week to meet the sustained requirement',
          'Participate in 3 more full-length timed contests to meet the competition readiness standard'
        ]
      };

      setReadinessData(mockData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching readiness data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="readiness-loading">Loading competition readiness...</div>;
  }

  if (!readinessData) {
    return <div className="readiness-error">Failed to load readiness data</div>;
  }

  const { overallReady, readinessScore, criteria, recommendations } = readinessData;

  return (
    <div className="competition-readiness">
      <div className="readiness-header">
        <h2>🏆 Competition Readiness Assessment</h2>
        <p className="readiness-subtitle">
          Based on Progressive Scaffolding Framework criteria for contest preparation
        </p>
      </div>

      {/* Overall Readiness Score */}
      <div className={`readiness-score-card ${overallReady ? 'ready' : 'not-ready'}`}>
        <div className="score-circle">
          <svg viewBox="0 0 200 200" className="score-svg">
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="15"
            />
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke={overallReady ? '#48bb78' : '#667eea'}
              strokeWidth="15"
              strokeDasharray={`${(readinessScore / 100) * 534} 534`}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
            />
            <text
              x="100"
              y="100"
              textAnchor="middle"
              dy=".3em"
              className="score-text"
            >
              {readinessScore}%
            </text>
          </svg>
        </div>
        <div className="score-info">
          <h3>{overallReady ? '✓ Competition Ready!' : 'Building Readiness...'}</h3>
          <p>
            {overallReady
              ? 'You meet all criteria for competing in AI-restricted contests!'
              : `You're ${readinessScore}% of the way to competition readiness. Keep practicing!`}
          </p>
        </div>
      </div>

      {/* Criteria Checklist */}
      <div className="criteria-section">
        <h3>Readiness Criteria</h3>
        <div className="criteria-list">
          {criteria.map((criterion, index) => (
            <div
              key={index}
              className={`criterion-card ${criterion.met ? 'met' : 'not-met'}`}
            >
              <div className="criterion-header">
                <div className="criterion-status">
                  {criterion.met ? (
                    <span className="status-icon success">✓</span>
                  ) : (
                    <span className="status-icon pending">○</span>
                  )}
                </div>
                <div className="criterion-title">
                  <h4>{criterion.criterion}</h4>
                  <p>{criterion.description}</p>
                </div>
              </div>

              <div className="criterion-body">
                <div className="criterion-stats">
                  <div className="stat-current">
                    <span className="stat-label">Current</span>
                    <span className="stat-value">
                      {criterion.currentValue}{criterion.unit}
                    </span>
                  </div>
                  <div className="stat-divider">→</div>
                  <div className="stat-target">
                    <span className="stat-label">Target</span>
                    <span className="stat-value">
                      {criterion.threshold}
                    </span>
                  </div>
                </div>

                <div className="criterion-progress-bar">
                  <div
                    className="criterion-progress-fill"
                    style={{
                      width: `${Math.min(criterion.progress, 100)}%`,
                      background: criterion.met
                        ? 'linear-gradient(90deg, #48bb78, #38a169)'
                        : 'linear-gradient(90deg, #667eea, #764ba2)'
                    }}
                  />
                </div>
                <div className="criterion-progress-text">
                  {criterion.progress}% complete
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="recommendations-section">
        <h3>📋 Next Steps to Competition Readiness</h3>
        <ul className="recommendations-list">
          {recommendations.map((recommendation, index) => (
            <li key={index} className="recommendation-item">
              <span className="recommendation-icon">→</span>
              {recommendation}
            </li>
          ))}
        </ul>
      </div>

      {/* Details Toggle */}
      <button
        className="details-toggle"
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? '▼' : '▶'} {showDetails ? 'Hide' : 'Show'} Detailed History
      </button>

      {/* Detailed History */}
      {showDetails && (
        <div className="details-section">
          <div className="details-grid">
            <div className="detail-card">
              <h4>📊 Recent ADI Trend</h4>
              <div className="adi-history">
                {readinessData.adiHistory.map((entry, index) => (
                  <div key={index} className="history-entry">
                    <span className="history-date">{entry.date}</span>
                    <span
                      className={`history-value ${
                        entry.value < 3.0 ? 'good' : 'needs-improvement'
                      }`}
                    >
                      ADI: {entry.value.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-card">
              <h4>🏁 Contest Performance</h4>
              <div className="contest-history">
                {readinessData.contestHistory.map((contest, index) => (
                  <div key={index} className="history-entry">
                    <span className="history-date">{contest.date}</span>
                    <span className="history-value">
                      Score: {contest.score} ({contest.duration}min)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Box */}
      <div className="readiness-info-box">
        <h4>💡 About Competition Readiness</h4>
        <p>
          These criteria ensure you can compete effectively in AI-restricted environments
          like ICPC, IOI, and ACPC contests. The Progressive Scaffolding Framework
          prepares you by gradually reducing AI availability while building independent
          problem-solving capabilities.
        </p>
        <div className="info-links">
          <a href="#" className="info-link">Learn about PSF methodology</a>
          <a href="#" className="info-link">View contest schedule</a>
        </div>
      </div>
    </div>
  );
}
