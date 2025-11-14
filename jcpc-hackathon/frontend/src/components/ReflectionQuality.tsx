/**
 * Reflection Quality Assessment Component
 * Implements the 4-level reflection scoring from PSF paper (Section 3.5):
 * Level 1: Surface (describes events)
 * Level 2: Recognition (identifies patterns)
 * Level 3: Analysis (explains reasoning)
 * Level 4: Synthesis (integrates learning)
 */

import React, { useState } from 'react';
import './ReflectionQuality.css';

interface ReflectionQualityProps {
  stage: 'pre' | 'during' | 'post';
  onSubmit: (reflection: string, quality?: number) => void;
  placeholder?: string;
  showGuidance?: boolean;
}

interface QualityLevel {
  level: number;
  name: string;
  description: string;
  examples: string[];
  color: string;
  minWords: number;
}

const QUALITY_LEVELS: QualityLevel[] = [
  {
    level: 1,
    name: 'Surface',
    description: 'Describes events without deeper understanding',
    examples: [
      'I solved the problem',
      'The AI helped me',
      'I used a loop'
    ],
    color: '#fc8181',
    minWords: 10
  },
  {
    level: 2,
    name: 'Recognition',
    description: 'Identifies patterns and connections',
    examples: [
      'This problem is similar to the two-pointer pattern I learned before',
      'I noticed the array was sorted, which means binary search might work',
      'The constraints suggest an O(n²) solution would time out'
    ],
    color: '#f6ad55',
    minWords: 20
  },
  {
    level: 3,
    name: 'Analysis',
    description: 'Explains reasoning and decision-making',
    examples: [
      'I chose dynamic programming because the problem has overlapping subproblems. The recurrence relation is dp[i] = min(dp[i-1], dp[i-2]) + cost[i]',
      'Binary search works here because the search space is monotonic - if k works, all values less than k also work',
      'I realized my greedy approach was failing because local optima don\'t guarantee global optimum in this problem'
    ],
    color: '#4299e1',
    minWords: 40
  },
  {
    level: 4,
    name: 'Synthesis',
    description: 'Integrates learning and metacognitive awareness',
    examples: [
      'This problem taught me that sorting can sometimes reduce complexity from O(n²) to O(n log n). I initially tried the brute force approach, but analyzing the constraints helped me realize I needed optimization. This connects to what I learned last week about time-space tradeoffs. Next time, I\'ll check constraints first before implementing.',
      'Initially, I struggled because I was thinking iteratively, but recursion was more natural here. The AI\'s hints helped me see the recursive structure. I now understand that tree problems often have elegant recursive solutions. I can apply this insight to similar problems in the future.',
      'The key insight was recognizing this as a shortest path problem disguised as a grid traversal. BFS was perfect because we needed minimum steps. I learned to identify problem patterns rather than jumping to implementation. This will help me in contests where pattern recognition is crucial.'
    ],
    color: '#48bb78',
    minWords: 60
  }
];

const STAGE_PROMPTS = {
  pre: {
    title: 'Pre-Solving Reflection',
    prompts: [
      'What is the problem asking you to do?',
      'What patterns do you recognize?',
      'What approach are you planning to take?',
      'What challenges do you anticipate?'
    ]
  },
  during: {
    title: 'During Problem-Solving Reflection',
    prompts: [
      'What approach are you trying?',
      'Why did you choose this approach?',
      'What alternatives did you consider?',
      'How is the AI assistance helping (or not helping)?'
    ]
  },
  post: {
    title: 'Post-Solving Reflection',
    prompts: [
      'What was your solution approach?',
      'What did you learn from this problem?',
      'How did AI assistance impact your understanding?',
      'Could you solve a similar problem independently now?'
    ]
  }
};

export function ReflectionQuality({ stage, onSubmit, placeholder, showGuidance = true }: ReflectionQualityProps) {
  const [reflection, setReflection] = useState('');
  const [predictedQuality, setPredictedQuality] = useState<number | null>(null);
  const [showLevelDetails, setShowLevelDetails] = useState(false);

  const stageInfo = STAGE_PROMPTS[stage];

  // Simple quality prediction based on word count and content
  const predictQualityLevel = (text: string): number => {
    const words = text.trim().split(/\s+/).length;
    const hasAnalysis = /because|since|therefore|thus|hence|reasoning|approach/.test(text.toLowerCase());
    const hasMetacognition = /learned|understand|realize|insight|recognize|future/.test(text.toLowerCase());
    const hasExamples = /example|instance|such as|like/.test(text.toLowerCase());

    if (words >= 60 && hasMetacognition && hasAnalysis) return 4;
    if (words >= 40 && hasAnalysis) return 3;
    if (words >= 20 && (hasAnalysis || hasExamples)) return 2;
    return 1;
  };

  const handleReflectionChange = (value: string) => {
    setReflection(value);
    if (value.trim().length > 0) {
      setPredictedQuality(predictQualityLevel(value));
    } else {
      setPredictedQuality(null);
    }
  };

  const handleSubmit = () => {
    const quality = predictQualityLevel(reflection);
    onSubmit(reflection, quality);
    setReflection('');
    setPredictedQuality(null);
  };

  const currentLevel = predictedQuality ? QUALITY_LEVELS[predictedQuality - 1] : null;
  const wordCount = reflection.trim().split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="reflection-quality">
      <div className="reflection-header">
        <h3>{stageInfo.title}</h3>
        <button
          className="guidance-toggle"
          onClick={() => setShowLevelDetails(!showLevelDetails)}
        >
          {showLevelDetails ? '▼' : '▶'} Quality Guide
        </button>
      </div>

      {showGuidance && (
        <div className="reflection-prompts">
          <p className="prompts-label">Consider these questions:</p>
          <ul>
            {stageInfo.prompts.map((prompt, idx) => (
              <li key={idx}>{prompt}</li>
            ))}
          </ul>
        </div>
      )}

      {showLevelDetails && (
        <div className="quality-levels-guide">
          <h4>Reflection Quality Levels</h4>
          <div className="levels-grid">
            {QUALITY_LEVELS.map((level) => (
              <div
                key={level.level}
                className={`level-card ${currentLevel?.level === level.level ? 'current' : ''}`}
                style={{ borderColor: level.color }}
              >
                <div className="level-header" style={{ background: level.color }}>
                  <span className="level-number">Level {level.level}</span>
                  <span className="level-name">{level.name}</span>
                </div>
                <div className="level-body">
                  <p className="level-description">{level.description}</p>
                  <div className="level-examples">
                    <strong>Example:</strong>
                    <p className="example-text">{level.examples[0]}</p>
                  </div>
                  <div className="level-requirement">
                    Minimum: ~{level.minWords} words
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="reflection-input-section">
        <textarea
          value={reflection}
          onChange={(e) => handleReflectionChange(e.target.value)}
          placeholder={placeholder || 'Write your reflection here... Be thoughtful and detailed.'}
          className="reflection-textarea"
          rows={8}
        />

        <div className="reflection-feedback">
          <div className="feedback-stats">
            <span className="word-count">
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
            {predictedQuality && (
              <span
                className="quality-indicator"
                style={{ background: QUALITY_LEVELS[predictedQuality - 1].color }}
              >
                Level {predictedQuality}: {QUALITY_LEVELS[predictedQuality - 1].name}
              </span>
            )}
          </div>

          {predictedQuality && predictedQuality < 3 && (
            <div className="improvement-tips">
              <strong>💡 Tips to improve quality:</strong>
              {predictedQuality === 1 && (
                <ul>
                  <li>Explain <em>why</em> you made certain decisions</li>
                  <li>Identify patterns or connections to previous problems</li>
                  <li>Add more detail about your thought process</li>
                </ul>
              )}
              {predictedQuality === 2 && (
                <ul>
                  <li>Explain the reasoning behind your approach</li>
                  <li>Discuss what you learned and how it applies to future problems</li>
                  <li>Reflect on how your understanding evolved</li>
                </ul>
              )}
            </div>
          )}

          {predictedQuality && predictedQuality >= 3 && (
            <div className="quality-praise">
              ✓ Excellent reflection! This demonstrates deep understanding.
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          className="submit-reflection-btn"
          disabled={reflection.trim().length < 20}
        >
          Submit Reflection
        </button>

        {reflection.trim().length < 20 && reflection.trim().length > 0 && (
          <p className="min-length-warning">
            Minimum 20 characters required for meaningful reflection
          </p>
        )}
      </div>
    </div>
  );
}
