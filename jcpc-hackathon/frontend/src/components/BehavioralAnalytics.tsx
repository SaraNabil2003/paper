/**
 * Behavioral Analytics Component for Coach Dashboard
 * Shows copy-paste events, tab switches, and plagiarism detection results
 */

import React, { useState, useEffect } from 'react';
import './BehavioralAnalytics.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface BehavioralMetrics {
  total_sessions: number;
  avg_paste_per_session: number;
  avg_tab_switches_per_session: number;
  avg_focus_losses_per_session: number;
  total_pastes: number;
  total_tab_switches: number;
  flagged_sessions: number;
  avg_similarity_score: number;
}

interface PlagiarismCase {
  id: number;
  student_name: string;
  email: string;
  problem_title: string;
  similarity_score: number;
  matched_sources: any[];
  flagged: boolean;
  timestamp: string;
}

interface SessionSummary {
  session_id: number;
  problem_title: string;
  difficulty: string;
  total_paste_events: number;
  total_copy_events: number;
  total_tab_switches: number;
  total_focus_losses: number;
  plagiarism_flagged: boolean;
  max_similarity_score: number;
  start_time: string;
}

interface BehavioralAnalyticsProps {
  studentId?: number;
}

export function BehavioralAnalytics({ studentId }: BehavioralAnalyticsProps) {
  const [metrics, setMetrics] = useState<BehavioralMetrics | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [plagiarismCases, setPlagiarismCases] = useState<PlagiarismCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'metrics' | 'sessions' | 'plagiarism'>('metrics');

  useEffect(() => {
    if (studentId) {
      fetchStudentBehavioralData();
    } else {
      fetchAllPlagiarismCases();
    }
  }, [studentId]);

  const fetchStudentBehavioralData = async () => {
    try {
      const [metricsRes, sessionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/behavioral/user/${studentId}`),
        fetch(`${API_BASE}/api/behavioral/plagiarism/user/${studentId}`)
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.metrics);
        setSessions(metricsData.sessions);
      }

      if (sessionsRes.ok) {
        const plagiarismData = await sessionsRes.json();
        setPlagiarismCases(plagiarismData.checks || []);
      }
    } catch (error) {
      console.error('Error fetching behavioral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPlagiarismCases = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/behavioral/plagiarism/flagged?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setPlagiarismCases(data.cases || []);
      }
    } catch (error) {
      console.error('Error fetching plagiarism cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (score: number): string => {
    if (score >= 0.9) return '#d32f2f'; // Critical
    if (score >= 0.8) return '#f44336'; // High
    if (score >= 0.7) return '#ff9800'; // Medium
    return '#ffc107'; // Low
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return <div className="behavioral-loading">Loading behavioral analytics...</div>;
  }

  return (
    <div className="behavioral-analytics">
      <div className="behavioral-tabs">
        <button
          className={view === 'metrics' ? 'active' : ''}
          onClick={() => setView('metrics')}
        >
          Behavioral Metrics
        </button>
        {studentId && (
          <button
            className={view === 'sessions' ? 'active' : ''}
            onClick={() => setView('sessions')}
          >
            Session History
          </button>
        )}
        <button
          className={view === 'plagiarism' ? 'active' : ''}
          onClick={() => setView('plagiarism')}
        >
          Plagiarism Detection
        </button>
      </div>

      {view === 'metrics' && metrics && (
        <div className="metrics-view">
          <h3>Behavioral Metrics Summary</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">📋</div>
              <div className="metric-value">{metrics.total_sessions || 0}</div>
              <div className="metric-label">Total Sessions</div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📝</div>
              <div className="metric-value">{Math.round(metrics.avg_paste_per_session || 0)}</div>
              <div className="metric-label">Avg Pastes/Session</div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🔄</div>
              <div className="metric-value">{Math.round(metrics.avg_tab_switches_per_session || 0)}</div>
              <div className="metric-label">Avg Tab Switches/Session</div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">👁️</div>
              <div className="metric-value">{Math.round(metrics.avg_focus_losses_per_session || 0)}</div>
              <div className="metric-label">Avg Focus Losses/Session</div>
            </div>

            <div className="metric-card warning">
              <div className="metric-icon">⚠️</div>
              <div className="metric-value">{metrics.flagged_sessions || 0}</div>
              <div className="metric-label">Plagiarism Flags</div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🎯</div>
              <div className="metric-value">
                {((metrics.avg_similarity_score || 0) * 100).toFixed(1)}%
              </div>
              <div className="metric-label">Avg Similarity Score</div>
            </div>
          </div>
        </div>
      )}

      {view === 'sessions' && sessions && (
        <div className="sessions-view">
          <h3>Session Behavioral History</h3>
          <div className="sessions-table">
            <table>
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Difficulty</th>
                  <th>Pastes</th>
                  <th>Tab Switches</th>
                  <th>Focus Losses</th>
                  <th>Plagiarism</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.session_id}>
                    <td>{session.problem_title}</td>
                    <td>
                      <span className={`difficulty-badge ${session.difficulty.toLowerCase()}`}>
                        {session.difficulty}
                      </span>
                    </td>
                    <td>{session.total_paste_events || 0}</td>
                    <td>{session.total_tab_switches || 0}</td>
                    <td>{session.total_focus_losses || 0}</td>
                    <td>
                      {session.plagiarism_flagged ? (
                        <span className="plagiarism-flag" style={{
                          color: getSeverityColor(session.max_similarity_score)
                        }}>
                          ⚠️ {(session.max_similarity_score * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="no-flag">✓ Clear</span>
                      )}
                    </td>
                    <td>{formatDate(session.start_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sessions.length === 0 && (
              <p className="no-data">No session data available</p>
            )}
          </div>
        </div>
      )}

      {view === 'plagiarism' && (
        <div className="plagiarism-view">
          <h3>{studentId ? 'Plagiarism Checks' : 'All Flagged Plagiarism Cases'}</h3>
          <div className="plagiarism-cases">
            {plagiarismCases.filter(c => c.flagged || !studentId).map((pCase) => (
              <div key={pCase.id} className="plagiarism-case">
                <div className="case-header">
                  <span className="case-severity" style={{
                    backgroundColor: getSeverityColor(pCase.similarity_score)
                  }}>
                    {(pCase.similarity_score * 100).toFixed(1)}%
                  </span>
                  {!studentId && (
                    <span className="student-name">{pCase.student_name}</span>
                  )}
                  <span className="problem-name">{pCase.problem_title}</span>
                  <span className="case-date">{formatDate(pCase.timestamp)}</span>
                </div>

                {pCase.matched_sources && pCase.matched_sources.length > 0 && (
                  <div className="case-details">
                    <strong>Matches:</strong>
                    <ul>
                      {pCase.matched_sources.map((match: any, idx: number) => (
                        <li key={idx}>
                          {match.type === 'student_similarity' && (
                            <>Student code similarity ({(match.similarity * 100).toFixed(1)}%)</>
                          )}
                          {match.type === 'ai_response_similarity' && (
                            <>AI response similarity ({(match.similarity * 100).toFixed(1)}%)</>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            {plagiarismCases.length === 0 && (
              <p className="no-data">No plagiarism cases detected</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
