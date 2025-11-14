/**
 * Progressive AI-Restriction Schedule Component
 * Implements the 4-phase weekly progression from the PSF paper (Section 3.4)
 */

import React, { useState, useEffect } from 'react';
import './ProgressiveSchedule.css';

interface ProgressiveScheduleProps {
  userId: number;
  enrollmentDate: string; // ISO date string
  currentWeek?: number;
}

interface PhaseInfo {
  phase: number;
  weeks: string;
  aiAvailable: number;
  aiRestricted: number;
  weeklyContests: number;
  description: string;
  color: string;
}

const PHASES: PhaseInfo[] = [
  {
    phase: 1,
    weeks: '1-4',
    aiAvailable: 80,
    aiRestricted: 20,
    weeklyContests: 1,
    description: 'Introduction Phase - Build familiarity with AI scaffolding',
    color: '#667eea'
  },
  {
    phase: 2,
    weeks: '5-8',
    aiAvailable: 60,
    aiRestricted: 40,
    weeklyContests: 2,
    description: 'Development Phase - Increase independent practice',
    color: '#764ba2'
  },
  {
    phase: 3,
    weeks: '9-12',
    aiAvailable: 40,
    aiRestricted: 60,
    weeklyContests: 3,
    description: 'Transition Phase - Majority AI-free problem-solving',
    color: '#f093fb'
  },
  {
    phase: 4,
    weeks: '13+',
    aiAvailable: 20,
    aiRestricted: 80,
    weeklyContests: 4,
    description: 'Competition Readiness - Contest-level independence',
    color: '#4facfe'
  }
];

export function ProgressiveSchedule({ userId, enrollmentDate, currentWeek }: ProgressiveScheduleProps) {
  const [weekNumber, setWeekNumber] = useState(currentWeek || 1);
  const [currentPhase, setCurrentPhase] = useState<PhaseInfo>(PHASES[0]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    aiProblemsCompleted: 0,
    aiFreeProblemsCompleted: 0,
    contestsCompleted: 0,
    requiredContests: 1
  });

  // Calculate current week from enrollment date
  useEffect(() => {
    if (!currentWeek) {
      const enrolled = new Date(enrollmentDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - enrolled.getTime());
      const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      setWeekNumber(diffWeeks);
    }
  }, [enrollmentDate, currentWeek]);

  // Determine current phase
  useEffect(() => {
    let phase: PhaseInfo;
    if (weekNumber <= 4) {
      phase = PHASES[0];
    } else if (weekNumber <= 8) {
      phase = PHASES[1];
    } else if (weekNumber <= 12) {
      phase = PHASES[2];
    } else {
      phase = PHASES[3];
    }
    setCurrentPhase(phase);

    // Calculate progress within phase
    const phaseStart = phase.phase === 1 ? 1 : (phase.phase - 1) * 4 + 1;
    const phaseLength = phase.phase === 4 ? 4 : 4;
    const weekInPhase = weekNumber - phaseStart + 1;
    const phaseProgress = Math.min((weekInPhase / phaseLength) * 100, 100);
    setProgress(phaseProgress);
  }, [weekNumber]);

  // Fetch user stats (mock implementation - replace with real API call)
  useEffect(() => {
    // TODO: Replace with actual API call
    // fetch(`/api/progressive-schedule/stats/${userId}`)
    //   .then(res => res.json())
    //   .then(data => setStats(data));

    // Mock data for now
    setStats({
      aiProblemsCompleted: 15,
      aiFreeProblemsCompleted: 8,
      contestsCompleted: 2,
      requiredContests: currentPhase.weeklyContests
    });
  }, [userId, currentPhase]);

  const totalProblems = stats.aiProblemsCompleted + stats.aiFreeProblemsCompleted;
  const aiFreePercentage = totalProblems > 0
    ? Math.round((stats.aiFreeProblemsCompleted / totalProblems) * 100)
    : 0;

  return (
    <div className="progressive-schedule">
      <div className="schedule-header">
        <h2>📊 Progressive AI-Restriction Schedule</h2>
        <div className="week-indicator">
          <span className="week-label">Week</span>
          <span className="week-number">{weekNumber}</span>
        </div>
      </div>

      <div className="current-phase-card" style={{ borderColor: currentPhase.color }}>
        <div className="phase-header" style={{ background: currentPhase.color }}>
          <h3>Phase {currentPhase.phase}: Weeks {currentPhase.weeks}</h3>
        </div>
        <div className="phase-body">
          <p className="phase-description">{currentPhase.description}</p>

          <div className="phase-targets">
            <div className="target-item">
              <div className="target-label">AI-Available Problems</div>
              <div className="target-value" style={{ color: currentPhase.color }}>
                {currentPhase.aiAvailable}%
              </div>
            </div>
            <div className="target-item">
              <div className="target-label">AI-Restricted Problems</div>
              <div className="target-value" style={{ color: currentPhase.color }}>
                {currentPhase.aiRestricted}%
              </div>
            </div>
            <div className="target-item">
              <div className="target-label">Weekly Contests</div>
              <div className="target-value" style={{ color: currentPhase.color }}>
                {currentPhase.weeklyContests}
              </div>
            </div>
          </div>

          <div className="phase-progress">
            <div className="progress-label">Phase Progress</div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                  background: currentPhase.color
                }}
              />
            </div>
            <div className="progress-percentage">{Math.round(progress)}%</div>
          </div>
        </div>
      </div>

      <div className="schedule-stats">
        <h3>Your Progress This Week</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🤖</div>
            <div className="stat-content">
              <div className="stat-value">{stats.aiProblemsCompleted}</div>
              <div className="stat-label">AI-Assisted Problems</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">{stats.aiFreeProblemsCompleted}</div>
              <div className="stat-label">AI-Free Problems</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-value">
                {stats.contestsCompleted} / {stats.requiredContests}
              </div>
              <div className="stat-label">Contests Completed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-value">{aiFreePercentage}%</div>
              <div className="stat-label">AI-Free Rate</div>
            </div>
          </div>
        </div>

        <div className="compliance-indicator">
          {aiFreePercentage >= currentPhase.aiRestricted ? (
            <div className="compliance-message success">
              ✓ You're meeting the AI-restriction target for this phase!
            </div>
          ) : (
            <div className="compliance-message warning">
              ⚠️ Try to complete more AI-free problems to meet the {currentPhase.aiRestricted}% target
            </div>
          )}
          {stats.contestsCompleted < stats.requiredContests && (
            <div className="compliance-message info">
              💡 Complete {stats.requiredContests - stats.contestsCompleted} more contest(s) this week
            </div>
          )}
        </div>
      </div>

      <div className="all-phases-timeline">
        <h3>Full Schedule Timeline</h3>
        <div className="phases-list">
          {PHASES.map((phase) => {
            const isActive = phase.phase === currentPhase.phase;
            const isPast = phase.phase < currentPhase.phase;

            return (
              <div
                key={phase.phase}
                className={`phase-timeline-item ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
                style={{
                  borderLeftColor: phase.color,
                  opacity: isPast ? 0.6 : 1
                }}
              >
                <div className="phase-marker" style={{ background: phase.color }}>
                  {isPast ? '✓' : phase.phase}
                </div>
                <div className="phase-info">
                  <div className="phase-title">
                    Phase {phase.phase}: Weeks {phase.weeks}
                    {isActive && <span className="current-badge">Current</span>}
                  </div>
                  <div className="phase-targets-inline">
                    {phase.aiAvailable}% AI / {phase.aiRestricted}% AI-Free / {phase.weeklyContests} contests/week
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="schedule-help">
        <h4>📖 About the Progressive Schedule</h4>
        <p>
          The Progressive Scaffolding Framework gradually reduces AI availability over 13+ weeks
          to build your independent problem-solving skills while preventing AI dependency.
          Each phase increases AI-free practice and contest participation to prepare you for
          actual competitions where AI assistance is prohibited.
        </p>
        <div className="help-tips">
          <div className="tip-item">
            <strong>Week 1-4:</strong> Learn to use AI effectively as a learning tool
          </div>
          <div className="tip-item">
            <strong>Week 5-8:</strong> Start building independent problem-solving habits
          </div>
          <div className="tip-item">
            <strong>Week 9-12:</strong> Majority of practice should be without AI
          </div>
          <div className="tip-item">
            <strong>Week 13+:</strong> Competition-ready with minimal AI dependence
          </div>
        </div>
      </div>
    </div>
  );
}
