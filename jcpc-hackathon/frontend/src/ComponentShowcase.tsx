/**
 * Component Showcase - Preview all new PSF components
 * Access at: http://localhost:5173/showcase
 */

import React, { useState } from 'react';
import { ProgressiveSchedule } from './components/ProgressiveSchedule';
import { CompetitionReadiness } from './components/CompetitionReadiness';
import { ModeInfo } from './components/ModeInfo';
import { ReflectionQuality } from './components/ReflectionQuality';
import './App.css';

export function ComponentShowcase() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'readiness' | 'modes' | 'reflection'>('schedule');
  const [currentMode, setCurrentMode] = useState(1);

  const handleReflectionSubmit = (reflection: string, quality?: number) => {
    console.log('Reflection submitted:', reflection);
    console.log('Quality level:', quality);
    alert(`Reflection submitted!\nQuality Level: ${quality}\n\nReflection: ${reflection.substring(0, 100)}...`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem' }}>
            🎯 PSF Component Showcase
          </h1>
          <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.95 }}>
            Preview all new professional components from the research paper
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => setActiveTab('schedule')}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              background: activeTab === 'schedule' ? '#667eea' : 'white',
              color: activeTab === 'schedule' ? 'white' : '#4a5568',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}
          >
            📊 Progressive Schedule
          </button>
          <button
            onClick={() => setActiveTab('readiness')}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              background: activeTab === 'readiness' ? '#667eea' : 'white',
              color: activeTab === 'readiness' ? 'white' : '#4a5568',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}
          >
            🏆 Competition Readiness
          </button>
          <button
            onClick={() => setActiveTab('modes')}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              background: activeTab === 'modes' ? '#667eea' : 'white',
              color: activeTab === 'modes' ? 'white' : '#4a5568',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}
          >
            🎯 Mode Information
          </button>
          <button
            onClick={() => setActiveTab('reflection')}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              background: activeTab === 'reflection' ? '#667eea' : 'white',
              color: activeTab === 'reflection' ? 'white' : '#4a5568',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}
          >
            💭 Reflection Quality
          </button>
        </div>

        {/* Mode Selector (for ModeInfo component) */}
        {activeTab === 'modes' && (
          <div style={{
            background: 'white',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>
              Select Current Mode:
            </label>
            <select
              value={currentMode}
              onChange={(e) => setCurrentMode(Number(e.target.value))}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '1rem',
                borderRadius: '6px',
                border: '2px solid #e2e8f0'
              }}
            >
              <option value={1}>Mode 1: Hint-Based</option>
              <option value={2}>Mode 2: Conceptual</option>
              <option value={3}>Mode 3: Minimal</option>
            </select>
          </div>
        )}

        {/* Component Display Area */}
        <div>
          {activeTab === 'schedule' && (
            <ProgressiveSchedule
              userId={1}
              enrollmentDate="2025-09-01"
              currentWeek={6}
            />
          )}

          {activeTab === 'readiness' && (
            <CompetitionReadiness userId={1} />
          )}

          {activeTab === 'modes' && (
            <ModeInfo
              currentMode={currentMode}
              showFullDetails={true}
            />
          )}

          {activeTab === 'reflection' && (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <ReflectionQuality
                stage="post"
                onSubmit={handleReflectionSubmit}
                showGuidance={true}
              />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          marginTop: '2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0 }}>📖 Component Information</h3>

          {activeTab === 'schedule' && (
            <div>
              <p><strong>Progressive Schedule:</strong> 4-phase weekly progression system</p>
              <ul>
                <li>Tracks AI vs AI-free problem completion ratios</li>
                <li>Shows contest participation requirements</li>
                <li>Monitors compliance with phase targets</li>
                <li>Currently showing: Week 6 (Phase 2 - Development)</li>
              </ul>
            </div>
          )}

          {activeTab === 'readiness' && (
            <div>
              <p><strong>Competition Readiness:</strong> 3-criterion assessment</p>
              <ul>
                <li>70%+ AI-restricted success rate</li>
                <li>ADI &lt;3.0 sustained for 2 weeks</li>
                <li>10+ full timed contests completed</li>
                <li>Shows overall readiness score and recommendations</li>
              </ul>
            </div>
          )}

          {activeTab === 'modes' && (
            <div>
              <p><strong>Mode Information:</strong> Three interaction modes documentation</p>
              <ul>
                <li>Mode 1: Hint-Based (Maximum Support)</li>
                <li>Mode 2: Conceptual (Moderate Support)</li>
                <li>Mode 3: Minimal (Low Support)</li>
                <li>Switch modes above to see different characteristics</li>
              </ul>
            </div>
          )}

          {activeTab === 'reflection' && (
            <div>
              <p><strong>Reflection Quality:</strong> 4-level metacognitive assessment</p>
              <ul>
                <li>Level 1 (Surface): Describes events - Red</li>
                <li>Level 2 (Recognition): Identifies patterns - Orange</li>
                <li>Level 3 (Analysis): Explains reasoning - Blue</li>
                <li>Level 4 (Synthesis): Integrates learning - Green</li>
                <li>Try typing to see real-time quality prediction!</li>
              </ul>
            </div>
          )}
        </div>

        {/* Back to Main App */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            ← Back to Main Platform
          </a>
        </div>
      </div>
    </div>
  );
}
