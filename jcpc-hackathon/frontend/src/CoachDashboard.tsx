import React, { useState, useEffect } from 'react';
import './CoachDashboard.css';
import { BehavioralAnalytics } from './components/BehavioralAnalytics';

const API_BASE = 'http://localhost:5000/api';

interface Student {
  id: number;
  name: string;
  email: string;
  current_mode?: number;
  currentMode?: number;
  adi: number;
  performance_with_ai?: number;
  performanceWithAI?: number;
  performance_without_ai?: number;
  performanceWithoutAI?: number;
  codeforces_rating?: number;
  codeforcesRating?: number;
}

interface DashboardData {
  students: Student[];
  averageADI: number;
  flaggedStudents: Student[];
  totalStudents: number;
  modeDistribution: {
    mode1: number;
    mode2: number;
    mode3: number;
  };
}

interface InterventionRecommendation {
  studentId: number;
  studentName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  actions: string[];
}

export function CoachDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentAnalytics, setStudentAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'adi' | 'name' | 'mode'>('adi');
  const [filterMode, setFilterMode] = useState<number | 'all'>('all');
  const [showInterventions, setShowInterventions] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentAnalytics(selectedStudent.id);
    }
  }, [selectedStudent]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard`);
      const data = await response.json();
      setDashboardData(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchStudentAnalytics = async (studentId: number) => {
    try {
      const response = await fetch(`${API_BASE}/analytics/${studentId}`);
      const data = await response.json();
      setStudentAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch student analytics:', error);
    }
  };

  const getADIColor = (adi: number): string => {
    if (adi < 2.5) return '#4caf50'; // Green - Healthy
    if (adi < 5.0) return '#ff9800'; // Orange - Moderate
    if (adi < 7.5) return '#ff5722'; // Red-Orange - High
    return '#d32f2f'; // Dark Red - Critical
  };

  const getADIZone = (adi: number): string => {
    if (adi < 2.5) return 'Healthy';
    if (adi < 5.0) return 'Moderate';
    if (adi < 7.5) return 'High';
    return 'Critical';
  };

  const getModeName = (mode: number): string => {
    if (mode === 1) return 'Hint-Based';
    if (mode === 2) return 'Conceptual';
    return 'Minimal';
  };

  const getModeColor = (mode: number): string => {
    if (mode === 1) return '#2196f3';
    if (mode === 2) return '#9c27b0';
    return '#4caf50';
  };

  const generateInterventions = (): InterventionRecommendation[] => {
    if (!dashboardData) return [];

    const recommendations: InterventionRecommendation[] = [];

    dashboardData.students.forEach(student => {
      const mode = student.current_mode || student.currentMode || 1;

      // Critical ADI
      if (student.adi > 7.5) {
        recommendations.push({
          studentId: student.id,
          studentName: student.name,
          severity: 'critical',
          message: `Critical AI dependency detected (ADI: ${student.adi.toFixed(1)})`,
          actions: [
            'Immediately restrict AI access for 1 week',
            'Schedule one-on-one mentoring session',
            'Assign AI-free practice problems',
            'Review problem-solving fundamentals'
          ]
        });
      }
      // High ADI
      else if (student.adi > 5.0) {
        recommendations.push({
          studentId: student.id,
          studentName: student.name,
          severity: 'high',
          message: `High AI dependency (ADI: ${student.adi.toFixed(1)})`,
          actions: [
            'Limit AI access to Mode 3 only',
            'Assign transfer problems (AI-restricted)',
            'Encourage peer collaboration',
            'Schedule check-in meeting'
          ]
        });
      }
      // Moderate ADI but low transfer performance
      else if (student.adi > 3.0) {
        const transferPerf = student.performance_without_ai || student.performanceWithoutAI || 0;
        if (transferPerf < 0.5) {
          recommendations.push({
            studentId: student.id,
            studentName: student.name,
            severity: 'medium',
            message: `Moderate dependency with low transfer (ADI: ${student.adi.toFixed(1)}, Transfer: ${(transferPerf * 100).toFixed(0)}%)`,
            actions: [
              'Assign more AI-free practice',
              'Focus on concept understanding',
              'Review reflection quality',
              'Consider mode adjustment'
            ]
          });
        }
      }

      // Stuck in Mode 1 for too long
      if (mode === 1) {
        recommendations.push({
          studentId: student.id,
          studentName: student.name,
          severity: 'low',
          message: 'Student in Mode 1 - Monitor for progression',
          actions: [
            'Check problem-solving count',
            'Review reflection quality',
            'Ensure ADI is decreasing',
            'Provide encouragement'
          ]
        });
      }
    });

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  };

  const getSortedStudents = (): Student[] => {
    if (!dashboardData) return [];

    let filtered = dashboardData.students;

    // Filter by mode
    if (filterMode !== 'all') {
      filtered = filtered.filter(s => (s.current_mode || s.currentMode) === filterMode);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'adi') {
        return b.adi - a.adi; // Descending
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'mode') {
        return (a.current_mode || a.currentMode || 0) - (b.current_mode || b.currentMode || 0);
      }
      return 0;
    });

    return sorted;
  };

  if (loading) {
    return <div className="coach-dashboard loading">Loading dashboard...</div>;
  }

  if (!dashboardData) {
    return <div className="coach-dashboard error">Failed to load dashboard data</div>;
  }

  const interventions = generateInterventions();
  const sortedStudents = getSortedStudents();

  return (
    <div className="coach-dashboard">
      <div className="dashboard-header">
        <h1>Coach Dashboard</h1>
        <div className="header-stats">
          <div className="stat-box">
            <div className="stat-value">{dashboardData.totalStudents}</div>
            <div className="stat-label">Total Students</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" style={{ color: getADIColor(dashboardData.averageADI) }}>
              {dashboardData.averageADI.toFixed(1)}
            </div>
            <div className="stat-label">Average ADI</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" style={{ color: '#d32f2f' }}>
              {dashboardData.flaggedStudents.length}
            </div>
            <div className="stat-label">Flagged Students</div>
          </div>
        </div>
      </div>

      <div className="dashboard-controls">
        <div className="control-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="adi">ADI (High to Low)</option>
            <option value="name">Name (A-Z)</option>
            <option value="mode">Mode</option>
          </select>
        </div>

        <div className="control-group">
          <label>Filter by Mode:</label>
          <select value={filterMode} onChange={(e) => setFilterMode(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}>
            <option value="all">All Modes</option>
            <option value="1">Mode 1 (Hint-Based)</option>
            <option value="2">Mode 2 (Conceptual)</option>
            <option value="3">Mode 3 (Minimal)</option>
          </select>
        </div>

        <button
          className="interventions-btn"
          onClick={() => setShowInterventions(!showInterventions)}
        >
          {showInterventions ? 'Hide' : 'Show'} Interventions ({interventions.length})
        </button>
      </div>

      {showInterventions && (
        <div className="interventions-panel">
          <h2>Intervention Recommendations</h2>
          {interventions.length === 0 ? (
            <p>No interventions needed at this time.</p>
          ) : (
            <div className="interventions-list">
              {interventions.map((rec, index) => (
                <div key={index} className={`intervention-card severity-${rec.severity}`}>
                  <div className="intervention-header">
                    <span className="student-name">{rec.studentName}</span>
                    <span className={`severity-badge ${rec.severity}`}>
                      {rec.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="intervention-message">{rec.message}</p>
                  <div className="intervention-actions">
                    <strong>Recommended Actions:</strong>
                    <ul>
                      {rec.actions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="dashboard-content">
        <div className="students-panel">
          <h2>Students ({sortedStudents.length})</h2>
          <div className="students-list">
            {sortedStudents.map(student => {
              const mode = student.current_mode || student.currentMode || 1;
              return (
                <div
                  key={student.id}
                  className={`student-card ${selectedStudent?.id === student.id ? 'selected' : ''}`}
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className="student-header">
                    <h3>{student.name}</h3>
                    <span
                      className="adi-badge"
                      style={{ backgroundColor: getADIColor(student.adi) }}
                    >
                      ADI: {student.adi.toFixed(1)}
                    </span>
                  </div>
                  <div className="student-info">
                    <div className="info-row">
                      <span className="label">Mode:</span>
                      <span
                        className="mode-badge"
                        style={{ backgroundColor: getModeColor(mode) }}
                      >
                        {getModeName(mode)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Rating:</span>
                      <span>{student.codeforces_rating || student.codeforcesRating || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Zone:</span>
                      <span style={{ color: getADIColor(student.adi), fontWeight: 'bold' }}>
                        {getADIZone(student.adi)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="details-panel">
          {selectedStudent ? (
            <div className="student-details">
              <h2>{selectedStudent.name} - Detailed Analytics</h2>
              {studentAnalytics ? (
                <div className="analytics-content">
                  <div className="analytics-grid">
                    <div className="metric-card">
                      <div className="metric-value" style={{ color: getADIColor(studentAnalytics.currentADI) }}>
                        {studentAnalytics.currentADI?.toFixed(2) || 'N/A'}
                      </div>
                      <div className="metric-label">Current ADI</div>
                      <div className="metric-zone">{studentAnalytics.adiZone}</div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-value">{((studentAnalytics.performanceGap || 0) * 100).toFixed(0)}%</div>
                      <div className="metric-label">Performance Gap</div>
                      <div className="metric-subtitle">With AI - Without AI</div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-value">{((studentAnalytics.successRateWithAI || 0) * 100).toFixed(0)}%</div>
                      <div className="metric-label">Success with AI</div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-value">{((studentAnalytics.successRateWithoutAI || 0) * 100).toFixed(0)}%</div>
                      <div className="metric-label">Success without AI</div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-value">{((studentAnalytics.transferPerformance || 0) * 100).toFixed(0)}%</div>
                      <div className="metric-label">Transfer Performance</div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-value">{((studentAnalytics.consultationFrequency || 0) * 100).toFixed(0)}%</div>
                      <div className="metric-label">Consultation Frequency</div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-value">{studentAnalytics.totalProblems || 0}</div>
                      <div className="metric-label">Problems Attempted</div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-value">{studentAnalytics.reflections || 0}</div>
                      <div className="metric-label">Reflections</div>
                    </div>
                  </div>

                  {studentAnalytics.progression && (
                    <div className="progression-info">
                      <h3>Mode Progression Status</h3>
                      <p>
                        Current Mode: <strong>{studentAnalytics.modeName}</strong>
                      </p>
                      {studentAnalytics.progression.shouldProgress && (
                        <p className="progress-alert">
                          ✅ Eligible for progression to Mode {studentAnalytics.progression.newMode}!
                        </p>
                      )}
                    </div>
                  )}

                  {/* Behavioral Analytics */}
                  <div className="behavioral-section">
                    <h3>Behavioral Analytics & Plagiarism Detection</h3>
                    <BehavioralAnalytics studentId={selectedStudent.id} />
                  </div>
                </div>
              ) : (
                <div>Loading analytics...</div>
              )}
            </div>
          ) : (
            <div className="no-selection">
              <p>Select a student to view detailed analytics</p>
            </div>
          )}
        </div>
      </div>

      <div className="mode-distribution">
        <h2>Mode Distribution</h2>
        <div className="distribution-chart">
          <div className="distribution-bar">
            <div
              className="mode-segment mode1"
              style={{
                width: `${(dashboardData.modeDistribution.mode1 / dashboardData.totalStudents) * 100}%`
              }}
            >
              Mode 1: {dashboardData.modeDistribution.mode1}
            </div>
            <div
              className="mode-segment mode2"
              style={{
                width: `${(dashboardData.modeDistribution.mode2 / dashboardData.totalStudents) * 100}%`
              }}
            >
              Mode 2: {dashboardData.modeDistribution.mode2}
            </div>
            <div
              className="mode-segment mode3"
              style={{
                width: `${(dashboardData.modeDistribution.mode3 / dashboardData.totalStudents) * 100}%`
              }}
            >
              Mode 3: {dashboardData.modeDistribution.mode3}
            </div>
          </div>
        </div>
      </div>

      {/* All Plagiarism Cases */}
      <div className="all-plagiarism-section">
        <h2>Plagiarism Detection Overview</h2>
        <BehavioralAnalytics />
      </div>
    </div>
  );
}
