/**
 * Mode Information Component
 * Displays detailed information about the three PSF interaction modes
 * Based on Section 3.2 of the research paper
 */

import React from 'react';
import './ModeInfo.css';

interface ModeInfoProps {
  currentMode: number;
  showFullDetails?: boolean;
  compact?: boolean;
}

interface ModeDetails {
  mode: number;
  name: string;
  tagline: string;
  philosophy: string;
  icon: string;
  color: string;
  characteristics: {
    provides: string[];
    doesNotProvide: string[];
  };
  targetAudience: string;
  exampleInteraction: {
    question: string;
    response: string;
  };
}

const MODE_DETAILS: ModeDetails[] = [
  {
    mode: 1,
    name: 'Hint-Based Mode',
    tagline: 'Maximum Support - Strategic Guidance',
    philosophy: 'LLM as thinking partner. Guides your thought process without revealing implementations.',
    icon: '💡',
    color: '#48bb78',
    characteristics: {
      provides: [
        'Guiding Socratic questions to help you think',
        'High-level algorithm suggestions',
        'Problem decomposition assistance',
        'Pattern recognition hints',
        'Conceptual explanations'
      ],
      doesNotProvide: [
        'Complete code solutions',
        'Pseudocode or implementation details',
        'Direct answers to the problem',
        'Step-by-step code walkthroughs'
      ]
    },
    targetAudience: 'Beginners (Codeforces <1200) or when struggling >45 minutes',
    exampleInteraction: {
      question: 'How do I find the maximum sum subarray?',
      response: 'Think about this: What happens if you track the best sum ending at each position? Could a negative sum ever help you in the future? What would you do if you encounter one?'
    }
  },
  {
    mode: 2,
    name: 'Conceptual Mode',
    tagline: 'Moderate Support - Algorithmic Concepts',
    philosophy: 'Provides algorithmic knowledge with pseudocode, but requires independent implementation.',
    icon: '🧠',
    color: '#667eea',
    characteristics: {
      provides: [
        'Algorithm explanations and theory',
        'Time and space complexity analysis',
        'Pseudocode representations',
        'Data structure recommendations',
        'Common pitfalls and edge cases'
      ],
      doesNotProvide: [
        'Working code in any language',
        'Bug fixes for your code',
        'Complete implementations',
        'Language-specific syntax help'
      ]
    },
    targetAudience: 'Intermediate (Codeforces 1200-1600) or when struggling 30-45 minutes',
    exampleInteraction: {
      question: 'What algorithm should I use for this graph problem?',
      response: 'This is a shortest path problem. Use BFS since all edges have equal weight. Pseudocode: 1) Create queue with start node, 2) Mark start as visited, 3) While queue not empty: process node and add unvisited neighbors...'
    }
  },
  {
    mode: 3,
    name: 'Minimal Mode',
    tagline: 'Low Support - Validation Only',
    philosophy: 'LLM as code reviewer. Validates your approach and identifies issues without fixing them.',
    icon: '✓',
    color: '#764ba2',
    characteristics: {
      provides: [
        'Solution verification (correct/incorrect)',
        'Bug identification (where errors exist)',
        'Complexity analysis of your code',
        'Reflective questions about your approach',
        'Alternative approach suggestions'
      ],
      doesNotProvide: [
        'Bug fixes or corrections',
        'Implementation guidance',
        'Algorithm selection help',
        'Detailed explanations',
        'Code improvements'
      ]
    },
    targetAudience: 'Advanced (Codeforces >1600) or contest preparation',
    exampleInteraction: {
      question: 'Is my solution correct?',
      response: 'Your approach is correct, but there\'s an off-by-one error in your loop boundary. Can you spot where? Also, consider: what happens when the array is empty?'
    }
  }
];

export function ModeInfo({ currentMode, showFullDetails = false, compact = false }: ModeInfoProps) {
  const currentModeDetails = MODE_DETAILS[currentMode - 1];

  if (compact) {
    return (
      <div className="mode-info-compact" style={{ borderColor: currentModeDetails.color }}>
        <div className="mode-compact-header">
          <span className="mode-icon">{currentModeDetails.icon}</span>
          <div className="mode-compact-text">
            <h4 style={{ color: currentModeDetails.color }}>{currentModeDetails.name}</h4>
            <p>{currentModeDetails.tagline}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!showFullDetails) {
    return (
      <div className="mode-info-card" style={{ borderColor: currentModeDetails.color }}>
        <div className="mode-header" style={{ background: currentModeDetails.color }}>
          <span className="mode-icon-large">{currentModeDetails.icon}</span>
          <div>
            <h3>Mode {currentMode}: {currentModeDetails.name}</h3>
            <p className="mode-tagline">{currentModeDetails.tagline}</p>
          </div>
        </div>
        <div className="mode-body">
          <p className="mode-philosophy">{currentModeDetails.philosophy}</p>

          <div className="mode-characteristics">
            <div className="characteristics-column provides">
              <h4>✓ What You'll Get:</h4>
              <ul>
                {currentModeDetails.characteristics.provides.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="characteristics-column does-not-provide">
              <h4>✗ What You Won't Get:</h4>
              <ul>
                {currentModeDetails.characteristics.doesNotProvide.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mode-target">
            <strong>Best For:</strong> {currentModeDetails.targetAudience}
          </div>
        </div>
      </div>
    );
  }

  // Full details view with all modes
  return (
    <div className="mode-info-full">
      <div className="mode-info-header">
        <h2>🎯 PSF Interaction Modes</h2>
        <p className="mode-info-subtitle">
          Progressive scaffolding from maximum support to minimal assistance
        </p>
      </div>

      <div className="current-mode-indicator">
        <span className="current-mode-label">Your Current Mode:</span>
        <span
          className="current-mode-badge"
          style={{ background: currentModeDetails.color }}
        >
          {currentModeDetails.icon} Mode {currentMode}: {currentModeDetails.name}
        </span>
      </div>

      <div className="all-modes-grid">
        {MODE_DETAILS.map((modeDetails) => {
          const isCurrent = modeDetails.mode === currentMode;
          const isPast = modeDetails.mode < currentMode;
          const isFuture = modeDetails.mode > currentMode;

          return (
            <div
              key={modeDetails.mode}
              className={`mode-card ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}`}
              style={{ borderColor: modeDetails.color }}
            >
              <div className="mode-card-header" style={{ background: modeDetails.color }}>
                <span className="mode-number">
                  {modeDetails.icon} Mode {modeDetails.mode}
                </span>
                {isCurrent && <span className="current-badge">Active</span>}
                {isPast && <span className="past-badge">Completed</span>}
                {isFuture && <span className="future-badge">Locked</span>}
              </div>

              <div className="mode-card-body">
                <h3>{modeDetails.name}</h3>
                <p className="mode-card-tagline">{modeDetails.tagline}</p>
                <p className="mode-card-philosophy">{modeDetails.philosophy}</p>

                <div className="mode-card-characteristics">
                  <div className="char-section">
                    <h4 className="char-heading provides">✓ Provides</h4>
                    <ul className="char-list">
                      {modeDetails.characteristics.provides.slice(0, 3).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="char-section">
                    <h4 className="char-heading restricts">✗ Restricts</h4>
                    <ul className="char-list">
                      {modeDetails.characteristics.doesNotProvide.slice(0, 3).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mode-example">
                  <div className="example-label">Example Interaction:</div>
                  <div className="example-question">
                    <strong>Q:</strong> {modeDetails.exampleInteraction.question}
                  </div>
                  <div className="example-response">
                    <strong>A:</strong> {modeDetails.exampleInteraction.response}
                  </div>
                </div>

                <div className="mode-target-audience">
                  <strong>Target:</strong> {modeDetails.targetAudience}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mode-progression-info">
        <h3>📈 Mode Progression Criteria</h3>
        <div className="progression-grid">
          <div className="progression-item">
            <h4>Mode 1 → Mode 2</h4>
            <ul>
              <li>Solve 5+ problems with hints in &lt;30 min each</li>
              <li>ADI &lt;4.0 for 2 consecutive weeks</li>
              <li>Reflection quality ≥2 (Basic understanding)</li>
            </ul>
          </div>
          <div className="progression-item">
            <h4>Mode 2 → Mode 3</h4>
            <ul>
              <li>Solve 10+ problems with concepts in &lt;20 min each</li>
              <li>ADI &lt;3.0 for 2 consecutive weeks</li>
              <li>70%+ success rate on AI-restricted problems</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mode-info-footer">
        <p>
          <strong>💡 Remember:</strong> The goal is to build independent problem-solving skills. Each mode
          reduces AI support to ensure you can compete effectively in AI-restricted environments like ICPC and IOI.
        </p>
      </div>
    </div>
  );
}
