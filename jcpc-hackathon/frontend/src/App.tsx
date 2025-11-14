import React, { useState, useEffect } from 'react';
import './App.css';
import { CoachDashboard } from './CoachDashboard';
import { ADIHistoryChart } from './ADIHistoryChart';
import { ResearchConsent } from './components/ResearchConsent';
import { useBehavioralTracking } from './hooks/useBehavioralTracking';
import { usePlagiarismCheck } from './hooks/usePlagiarismCheck';
import { Login } from './Login';
import { ClearStorage } from './ClearStorage';

const API_BASE = 'http://localhost:5000/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'teacher';
}

interface Student {
  id: number;
  name: string;
  currentMode: number;
  adi: number;
  performanceWithAI: number;
  performanceWithoutAI: number;
}

interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  codeforcesRating: number;
}

interface Session {
  studentId: number;
  problemId: number;
  startTime: number;
  aiAvailable: boolean;
  aiRequested: boolean;
  aiAccessGranted: boolean;
  submissionAttempts: number;
  struggleTime: number;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [showAiModeSelection, setShowAiModeSelection] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiRequesting, setAiRequesting] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [showReflection, setShowReflection] = useState<string | null>(null);
  const [reflectionContent, setReflectionContent] = useState('');
  const [view, setView] = useState<'problem' | 'dashboard' | 'analytics'>(
    user?.role === 'teacher' ? 'dashboard' : 'problem'
  );
  const [analytics, setAnalytics] = useState<any>(null);
  const [code, setCode] = useState('// Write your solution here\nfunction solve(input) {\n  // Your code here\n  return null;\n}');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [showPlagiarismWarning, setShowPlagiarismWarning] = useState(false);
  const [plagiarismResult, setPlagiarismResult] = useState<any>(null);

  const studentId = user?.id || 1; // Use logged in user ID or default

  // Behavioral tracking hook
  useBehavioralTracking({
    userId: studentId,
    sessionId: session?.studentId || null,
    problemId: currentProblem?.id || null,
    enabled: session !== null
  });

  // Plagiarism detection hook
  const { checkPlagiarism, checking: plagiarismChecking } = usePlagiarismCheck();

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Test backend connection first
      testBackendConnection();
      if (user.role === 'student') {
        loadStudent();
      }
      loadProblems();
    }
  }, [user]);

  const testBackendConnection = async () => {
    try {
      const res = await fetch(`${API_BASE}/problems`);
      if (res.ok) {
        console.log('✅ Backend connection successful');
      } else {
        console.warn('⚠️ Backend responded with error:', res.status);
      }
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      alert('Cannot connect to backend server!\n\nPlease make sure:\n1. Backend is running: cd backend && npm start\n2. Server is on http://localhost:5000\n\nCheck the browser console (F12) for details.');
    }
  };

  useEffect(() => {
    if (session && !session.aiRequested) {
      const timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [session]);

  // Periodically refresh student data to update ADI and mode
  useEffect(() => {
    if (session) {
      const refreshInterval = setInterval(() => {
        loadStudent();
        loadAnalytics();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(refreshInterval);
    }
  }, [session]);

  const loadStudent = async () => {
    try {
      const res = await fetch(`${API_BASE}/student/${studentId}`);
      const data = await res.json();
      setStudent(data);
      loadAnalytics();
    } catch (error) {
      console.error('Failed to load student:', error);
    }
  };

  const loadProblems = async () => {
    try {
      const res = await fetch(`${API_BASE}/problems`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log('Loaded problems:', data);
      setProblems(data);
    } catch (error) {
      console.error('Failed to load problems:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        console.error('Backend connection failed. Is the server running on port 5000?');
      }
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/${studentId}`);
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const startProblem = async (problemId: number, aiAvailable: boolean) => {
    console.log('Starting problem:', problemId, 'with AI available:', aiAvailable);
    console.log('Student ID:', studentId);
    console.log('Problem ID:', problemId);

    if (!studentId || !problemId) {
      alert(`Missing required data: studentId=${studentId}, problemId=${problemId}`);
      return;
    }

    try {
      const requestBody = {
        studentId: Number(studentId),
        problemId: Number(problemId),
        aiAvailable: aiAvailable
      };
      console.log('Request body:', requestBody);

      const res = await fetch(`${API_BASE}/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!res.ok) {
        let errorMessage = `HTTP error! status: ${res.status}`;
        let errorDetails = {};
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorDetails = errorData;
          console.error('Backend error response:', errorData);
        } catch (e) {
          // If response isn't JSON, use status text
          errorMessage = res.statusText || errorMessage;
          console.error('Non-JSON error response:', res.statusText);
        }
        console.error('Full error details:', { status: res.status, errorMessage, errorDetails });
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      console.log('Session started:', data);
      setSession(data.session);
      
      // Get problem from local state or fetch it
      let problem = problems.find(p => p.id === problemId) || null;
      if (!problem) {
        // If problem not in local state, fetch it
        const problemRes = await fetch(`${API_BASE}/problems/${problemId}`);
        if (!problemRes.ok) {
          throw new Error(`Failed to fetch problem details: ${problemRes.statusText}`);
        }
        problem = await problemRes.json();
      }
      
      setCurrentProblem(problem);
      
      // Set initial code template based on problem
      const initialCode = problem.id === 1 
        ? `// Two Sum Problem\n// Given an array of integers nums and an integer target,\n// return indices of the two numbers such that they add up to target.\n\nfunction solve(input) {\n  const { nums, target } = input;\n  // Your solution here\n  // Example: return [0, 1] for nums=[2,7,11,15], target=9\n  return [];\n}`
        : problem.id === 2
        ? `// Binary Search Problem\n// Given a sorted array and a target, return the index of target\n// Return -1 if target is not found\n\nfunction solve(input) {\n  const { nums, target } = input;\n  // Your solution here\n  // Example: return 4 for nums=[-1,0,3,5,9,12], target=9\n  return -1;\n}`
        : '// Write your solution here\nfunction solve(input) {\n  // Your code here\n  return null;\n}';
      
      setTimeElapsed(0);
      setAiResponse(null);
      setCode(initialCode);
      setTestResults([]);
      setOutput('');
      setView('problem');
      setShowReflection('pre-solving');
      setShowAiModeSelection(false);
      setSelectedProblem(null);
    } catch (error) {
      console.error('Failed to start session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a network/connection error
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
        alert(`Cannot connect to backend server.\n\nPlease make sure:\n1. Backend server is running on http://localhost:5000\n2. No firewall is blocking the connection\n\nError: ${errorMessage}`);
      } else {
        alert(`Failed to start problem: ${errorMessage}`);
      }
    }
  };

  const recordSubmission = async () => {
    if (!session) return;
    
    try {
      await fetch(`${API_BASE}/session/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          updates: { submissionAttempts: (session.submissionAttempts || 0) + 1 }
        })
      });
      setSession(prev => prev ? { ...prev, submissionAttempts: (prev.submissionAttempts || 0) + 1 } : null);
    } catch (error) {
      console.error('Failed to record submission:', error);
    }
  };

  const requestAIHelp = async () => {
    if (!session || !currentProblem) return;
    
    setAiRequesting(true);
    try {
      const res = await fetch(`${API_BASE}/ai/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          problemId: currentProblem.id,
          userQuery: userQuery || 'I need help with this problem.',
          timeElapsed
        })
      });
      
      const data = await res.json();
      if (data.error) {
        alert(data.message);
      } else {
        setAiResponse(data.response);
        setSession(prev => prev ? { ...prev, aiRequested: true, aiAccessGranted: true } : null);
        
        // Refresh student data to update ADI after AI interaction
        loadStudent();
        loadAnalytics();
        
        // Show current mode info
        console.log(`AI Response in ${data.modeName} mode (Mode ${data.mode})`);
      }
    } catch (error) {
      console.error('Failed to request AI help:', error);
      alert('Failed to connect to AI service');
    } finally {
      setAiRequesting(false);
    }
  };

  const submitReflection = async (stage: string) => {
    if (!currentProblem || !reflectionContent.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          problemId: currentProblem.id,
          stage,
          content: reflectionContent,
          quality: reflectionContent.length > 100 ? 3 : reflectionContent.length > 50 ? 2 : 1
        })
      });
      
      const data = await res.json();
      console.log('Reflection submitted:', data);
      
      setReflectionContent('');
      setShowReflection(null);
      
      if (stage === 'pre-solving') {
        // Continue to problem solving - reflection helps with mode progression
      } else if (stage === 'during') {
        // Can request AI help now
      } else if (stage === 'post-solving') {
        // Problem completed - check for mode progression
        loadStudent();
        loadAnalytics();
        
        // Check if mode progression happened (reflections are part of progression criteria)
        const updatedStudent = await fetch(`${API_BASE}/student/${studentId}`).then(r => r.json());
        if (updatedStudent) {
          setStudent(updatedStudent);
        }
      }
    } catch (error) {
      console.error('Failed to submit reflection:', error);
      alert('Failed to submit reflection. Please try again.');
    }
  };

  const runCode = async () => {
    if (!code.trim()) {
      alert('Please write some code first!');
      return;
    }

    setIsRunning(true);
    setOutput('');
    setTestResults([]);

    // Simple test cases for demo
    const testCases = getTestCasesForProblem(currentProblem?.id || 0);
    
    try {
      // In a real implementation, you'd send code to a backend code execution service
      // For now, we'll do a simple client-side evaluation
      const results = testCases.map((testCase, idx) => {
        try {
          // This is a simplified version - in production, use a sandboxed code execution service
          const result = evaluateCode(code, testCase.input);
          const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
          
          return {
            passed,
            message: passed ? 'Correct output' : `Expected: ${JSON.stringify(testCase.expected)}, Got: ${JSON.stringify(result)}`
          };
        } catch (error) {
          return {
            passed: false,
            message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      });

      setTestResults(results);
      const allPassed = results.every(r => r.passed);
      setOutput(allPassed ? 'All tests passed! ✓' : `${results.filter(r => r.passed).length}/${results.length} tests passed`);
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Failed to run code'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const submitSolution = async () => {
    if (!session || !currentProblem) {
      alert('No active session. Please start a problem first.');
      return;
    }

    if (!code.trim()) {
      alert('Please write a solution before submitting!');
      return;
    }

    // Run tests first
    await runCode();
    
    // Wait a moment for tests to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const allPassed = testResults.length > 0 && testResults.every(r => r.passed);
    
    try {
      // Update session
      await fetch(`${API_BASE}/session/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          updates: { submissionAttempts: (session.submissionAttempts || 0) + 1 }
        })
      });
      
      setSession(prev => prev ? { ...prev, submissionAttempts: (prev.submissionAttempts || 0) + 1 } : null);
      
      // Record the attempt (for ADI and mode progression tracking)
      if (allPassed) {
        // Record successful attempt
        const attemptRes = await fetch(`${API_BASE}/attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            problemId: currentProblem.id,
            success: true,
            withAI: session.aiRequested || false,
            timeSpent: timeElapsed
          })
        });
        
        const attemptData = await attemptRes.json();

        // Run plagiarism check on successful submission
        if (attemptData.attempt?.id) {
          const plagiarismCheck = await checkPlagiarism(
            studentId,
            attemptData.attempt.id,
            currentProblem.id,
            code
          );

          if (plagiarismCheck.flagged) {
            setPlagiarismResult(plagiarismCheck);
            setShowPlagiarismWarning(true);
          }
        }

        // Check for mode progression
        if (attemptData.progression && attemptData.progression.shouldProgress) {
          const oldMode = attemptData.progression.currentMode;
          const newMode = attemptData.progression.newMode;
          alert(`🎉 All tests passed! You've also progressed from Mode ${oldMode} to Mode ${newMode}!`);
        } else {
          alert('🎉 Congratulations! All tests passed! You can mark this as solved.');
        }

        // Update student data
        if (attemptData.updatedStudent) {
          setStudent(attemptData.updatedStudent);
          loadAnalytics();
        }
      } else {
        // Record failed attempt
        await fetch(`${API_BASE}/attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            problemId: currentProblem.id,
            success: false,
            withAI: session.aiRequested || false,
            timeSpent: timeElapsed
          })
        });
        
        alert(`Some tests failed. Keep trying! (${testResults.filter(r => r.passed).length}/${testResults.length} passed)`);
        loadStudent(); // Refresh to update ADI
        loadAnalytics();
      }
    } catch (error) {
      console.error('Failed to submit solution:', error);
      alert('Failed to submit solution. Please try again.');
    }
  };

  const getTestCasesForProblem = (problemId: number) => {
    // Simple test cases for demo
    if (problemId === 1) { // Two Sum
      return [
        { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
        { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
        { input: { nums: [3, 3], target: 6 }, expected: [0, 1] }
      ];
    } else if (problemId === 2) { // Binary Search
      return [
        { input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 }, expected: 4 },
        { input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 }, expected: -1 },
        { input: { nums: [5], target: 5 }, expected: 0 }
      ];
    }
    return [];
  };

  const evaluateCode = (code: string, input: any) => {
    // WARNING: This is a simplified evaluation for demo purposes
    // In production, use a proper sandboxed code execution service
    try {
      // Create a safe evaluation context
      const func = new Function('input', `
        ${code}
        return solve(input);
      `);
      return func(input);
    } catch (error) {
      throw new Error(`Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const completeProblem = async (success: boolean) => {
    if (!session || !currentProblem) return;

    try {
      const res = await fetch(`${API_BASE}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          problemId: currentProblem.id,
          success,
          withAI: session.aiRequested || false,
          timeSpent: timeElapsed
        })
      });
      
      const data = await res.json();
      
      // Check for mode progression
      if (data.progression && data.progression.shouldProgress) {
        const oldMode = data.progression.currentMode;
        const newMode = data.progression.newMode;
        alert(`🎉 Congratulations! You've progressed from Mode ${oldMode} (${getModeName(oldMode)}) to Mode ${newMode} (${getModeName(newMode)})!`);
      }
      
      // Update student data with latest ADI and mode
      if (data.updatedStudent) {
        setStudent(data.updatedStudent);
      }
      
      setShowReflection('post-solving');
      loadStudent();
      loadAnalytics();
    } catch (error) {
      console.error('Failed to record attempt:', error);
      alert('Failed to record attempt. Please try again.');
    }
  };

  const getModeName = (mode: number) => {
    return mode === 1 ? 'Hint-Based' : mode === 2 ? 'Conceptual' : 'Minimal';
  };

  const getADIStatus = (adi: number) => {
    if (adi < 2.5) return { color: '#28a745', label: 'Healthy', zone: 'green' };
    if (adi < 5.0) return { color: '#ffc107', label: 'Moderate', zone: 'yellow' };
    if (adi < 7.5) return { color: '#fd7e14', label: 'High', zone: 'orange' };
    return { color: '#dc3545', label: 'Critical', zone: 'red' };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setStudent(null);
    setSession(null);
    setCurrentProblem(null);
  };

  // Show login page if not authenticated
  if (!user) {
    return (
      <>
        <Login onLoginSuccess={handleLoginSuccess} />
        <ClearStorage />
      </>
    );
  }

  // Reduced struggle time for demo: 1 minute for Easy, 2 minutes for others
  const minStruggleTime = currentProblem?.difficulty === 'Easy' ? 60 : 120;
  const canRequestAI = session && session.aiAvailable && timeElapsed >= minStruggleTime && (session.submissionAttempts || 0) > 0;

  if (showAiModeSelection && selectedProblem) {
    return (
      <div className="reflection-modal">
        <div className="reflection-content">
          <h2>Choose AI Assistance Mode</h2>
          <p style={{ marginBottom: '1.5rem', color: '#666' }}>
            Select how you want to practice this problem:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              onClick={() => startProblem(selectedProblem.id, false)}
              className="btn-primary"
              style={{
                padding: '1.5rem',
                textAlign: 'left',
                background: '#28a745',
                border: 'none'
              }}
            >
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                🎯 Practice WITHOUT AI (Recommended)
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                Build independence and reduce your AI Dependency Index. Best for improving transfer performance on novel problems.
              </div>
            </button>

            <button
              onClick={() => startProblem(selectedProblem.id, true)}
              className="btn-secondary"
              style={{
                padding: '1.5rem',
                textAlign: 'left',
                background: '#667eea',
                border: 'none',
                color: 'white'
              }}
            >
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                🤖 Practice WITH AI Available
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                AI assistance available after struggle time. Use when learning new concepts or stuck on challenging problems.
              </div>
            </button>

            <button
              onClick={() => {
                setShowAiModeSelection(false);
                setSelectedProblem(null);
              }}
              className="btn-secondary"
              style={{ marginTop: '0.5rem' }}
            >
              Cancel
            </button>
          </div>

          {student && student.adi > 5 && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#fff3cd',
              borderRadius: '4px',
              border: '1px solid #ffc107'
            }}>
              <strong>⚠️ High AI Dependency Detected</strong>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                Your ADI is {student.adi.toFixed(1)}. Consider practicing WITHOUT AI to build independence and lower your dependency score.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showReflection) {
    const prompts = {
      'pre-solving': [
        "Describe this problem in your own words.",
        "What is the input? What is the output?",
        "What makes this problem challenging?",
        "What similar problems have you solved?"
      ],
      'during': [
        "What approach are you considering? Why?",
        "What are alternative approaches? Why did you reject them?",
        "What data structure will you use? Why?",
        "Estimate time/space complexity of your approach"
      ],
      'post-solving': [
        "How did AI assistance help you? What did you learn?",
        "Could you solve a similar problem independently now?",
        "What would you do differently next time?",
        "Rate your understanding: 1 (memorized solution) to 5 (can explain and modify)"
      ]
    };

    return (
      <div className="reflection-modal">
        <div className="reflection-content">
          <h2>Reflection: {showReflection === 'pre-solving' ? 'Problem Understanding' : 
                           showReflection === 'during' ? 'Approach Selection' : 'Solution Evaluation'}</h2>
          <div className="reflection-prompts">
            {prompts[showReflection as keyof typeof prompts].map((prompt, i) => (
              <div key={i} className="prompt-item">• {prompt}</div>
            ))}
          </div>
          <textarea
            value={reflectionContent}
            onChange={(e) => setReflectionContent(e.target.value)}
            placeholder="Write your reflection here..."
            rows={8}
            className="reflection-textarea"
          />
          <div className="reflection-actions">
            <button onClick={() => submitReflection(showReflection)} className="btn-primary">
              Submit Reflection
            </button>
            {showReflection === 'pre-solving' && (
              <button onClick={() => setShowReflection(null)} className="btn-secondary">
                Skip for Now
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Progressive Scaffolding Framework (PSF)</h1>
        <div className="header-info">
          <span style={{ marginRight: '15px', color: '#666' }}>
            {user.name} ({user.role})
          </span>
          {student && (
            <>
              <span className={`mode-badge mode-${student.currentMode}`}>
                Mode {student.currentMode}: {getModeName(student.currentMode)}
              </span>
              <span className={`adi-badge adi-${getADIStatus(student.adi).zone}`}>
                ADI: {student.adi.toFixed(1)} ({getADIStatus(student.adi).label})
              </span>
            </>
          )}
          <button
            onClick={handleLogout}
            style={{
              marginLeft: '15px',
              padding: '6px 12px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <nav className="app-nav">
        {user.role === 'student' && (
          <>
            <button
              onClick={() => setView('problem')}
              className={view === 'problem' ? 'active' : ''}
            >
              Problem Solving
            </button>
            <button
              onClick={() => { setView('analytics'); loadAnalytics(); }}
              className={view === 'analytics' ? 'active' : ''}
            >
              My Analytics
            </button>
          </>
        )}
        <button
          onClick={() => setView('dashboard')}
          className={view === 'dashboard' ? 'active' : ''}
        >
          {user.role === 'teacher' ? 'Dashboard' : 'Coach Dashboard'}
        </button>
      </nav>

      <main className="app-main">
        {view === 'problem' && (
          <div className="problem-view">
            {!currentProblem ? (
              <div className="problem-selector">
                <h2>Select a Problem</h2>
                {problems.length > 0 && (
                  <>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                      Found {problems.length} problem(s). Click on a card to start.
                    </p>
                    <button 
                      onClick={() => {
                        console.log('Test button clicked - clicks are working!');
                        alert('Test button works! If problem cards don\'t work, check console for errors.');
                      }}
          style={{
                        padding: '0.5rem 1rem',
                        marginBottom: '1rem',
                        background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Test: Click Me (to verify clicks work)
                    </button>
                  </>
                )}
                <div className="problem-list">
                  {problems.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                      <p>Loading problems...</p>
                      <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        If problems don't load, check that the backend is running on port 5000
                      </p>
                    </div>
                  ) : (
                    problems.map(problem => (
                      <div
                        key={problem.id}
                        className="problem-card"
                        onClick={(e) => {
                          console.log('Problem card clicked:', problem.id, problem.title);
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedProblem(problem);
                          setShowAiModeSelection(true);
                        }}
                        onMouseDown={(e) => {
                          console.log('Mouse down on problem card:', problem.id);
                        }}
                        role="button"
                        aria-label={`Start problem: ${problem.title}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            console.log('Keyboard activation:', problem.id);
                            setSelectedProblem(problem);
                            setShowAiModeSelection(true);
                          }
                        }}
                        style={{
                          cursor: 'pointer',
                          pointerEvents: 'auto'
                        }}
                      >
                        <h3>{problem.title}</h3>
                        <p>{problem.description}</p>
                        <div className="problem-meta">
                          <span className={`difficulty-badge difficulty-${problem.difficulty.toLowerCase()}`}>
                            {problem.difficulty}
                          </span>
                          <span>Rating: {problem.codeforcesRating}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="problem-solving">
                <div className="problem-header">
                  <h2>{currentProblem.title}</h2>
                  <div className="problem-info">
                    <span className={`difficulty-badge difficulty-${currentProblem.difficulty.toLowerCase()}`}>
                      {currentProblem.difficulty}
                    </span>
                    {session && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        background: session.aiAvailable ? '#667eea' : '#28a745',
                        color: 'white'
                      }}>
                        {session.aiAvailable ? '🤖 AI Available' : '🎯 AI-Free'}
                      </span>
                    )}
                    <span className="timer">⏱️ {formatTime(timeElapsed)}</span>
                  </div>
                </div>

                <div className="problem-description">
                  <p>{currentProblem.description}</p>
                </div>

                <div className="code-editor-section">
                  <h3>Your Solution</h3>
                  <div className="code-editor-container">
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="code-editor"
                      placeholder="Write your solution here..."
                      spellCheck={false}
                    />
                  </div>
                  
                  <div className="code-actions">
                    <button 
                      onClick={runCode} 
                      className="btn-primary"
                      disabled={isRunning || !code.trim()}
                    >
                      {isRunning ? 'Running...' : '▶ Run Code'}
                    </button>
                    <button 
                      onClick={submitSolution} 
                      className="btn-success"
                      disabled={isRunning || !code.trim() || (session?.submissionAttempts || 0) === 0}
                    >
                      ✓ Submit Solution
                    </button>
                    <button 
                      onClick={() => setCode('// Write your solution here\nfunction solve(input) {\n  // Your code here\n  return null;\n}')} 
                      className="btn-secondary"
                    >
                      Reset Code
                    </button>
                  </div>

                  {output && (
                    <div className="code-output">
                      <h4>Output:</h4>
                      <pre>{output}</pre>
                    </div>
                  )}

                  {testResults.length > 0 && (
                    <div className="test-results">
                      <h4>Test Results:</h4>
                      {testResults.map((result, idx) => (
                        <div key={idx} className={`test-result ${result.passed ? 'passed' : 'failed'}`}>
                          <span className="test-icon">{result.passed ? '✓' : '✗'}</span>
                          <span>Test {idx + 1}: {result.passed ? 'Passed' : 'Failed'}</span>
                          {result.message && <span className="test-message">{result.message}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="problem-actions">
                  <button onClick={recordSubmission} className="btn-secondary">
                    Record Submission Attempt
                  </button>
                  <button 
                    onClick={() => completeProblem(true)} 
                    className="btn-success"
                    disabled={!session || (session.submissionAttempts || 0) === 0}
                  >
                    Mark as Solved
                  </button>
                  <button 
                    onClick={() => completeProblem(false)} 
                    className="btn-warning"
                  >
                    Give Up
                  </button>
                </div>

                <div className="ai-assistance" style={{
                  background: '#f8f9fa',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginTop: '20px'
                }}>
                  <h3 style={{ marginTop: 0, color: '#667eea' }}>🤖 AI Assistance - Solve with AI</h3>
                  {session && !session.aiAvailable ? (
                    <div className="ai-restriction" style={{
                      background: '#d4edda',
                      border: '1px solid #c3e6cb',
                      borderRadius: '4px',
                      padding: '1rem'
                    }}>
                      <p style={{ margin: 0 }}>
                        🎯 <strong>AI-Free Practice Mode</strong><br/>
                        You chose to solve this problem without AI assistance to build independence and reduce your AI Dependency Index. Keep going!
                      </p>
                    </div>
                  ) : !canRequestAI ? (
                    <div className="ai-restriction" style={{
                      background: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderRadius: '4px',
                      padding: '1rem'
                    }}>
                      <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>
                        AI Help Requirements (Struggle-First Protocol):
                      </p>
                      <ul style={{ marginLeft: '20px', marginBottom: '10px' }}>
                        <li style={{ color: timeElapsed >= minStruggleTime ? 'green' : 'orange' }}>
                          {timeElapsed >= minStruggleTime ? '✓' : '⏳'}
                          {' '}Work for {Math.floor(minStruggleTime / 60)} minute(s)
                          {timeElapsed < minStruggleTime && ` (${Math.floor((minStruggleTime - timeElapsed) / 60)}m ${(minStruggleTime - timeElapsed) % 60}s remaining)`}
                        </li>
                        <li style={{ color: (session?.submissionAttempts || 0) > 0 ? 'green' : 'orange' }}>
                          {(session?.submissionAttempts || 0) > 0 ? '✓' : '📝'}
                          {' '}Submit at least one solution attempt
                          {(session?.submissionAttempts || 0) === 0 && ' (Required)'}
                        </li>
                      </ul>
                      {student && student.adi > 7.5 && (
                        <p style={{ color: '#dc3545', marginTop: '10px', fontWeight: 'bold' }}>
                          ⚠️ Your ADI is too high ({student.adi.toFixed(1)}). Complete some AI-free problems first.
                        </p>
                      )}
                    </div>
                  ) : null}
                  
                  {canRequestAI && !session?.aiRequested && (
                    <div className="ai-request" style={{
                      background: 'white',
                      border: '1px solid #667eea',
                      borderRadius: '4px',
                      padding: '1rem'
                    }}>
                      <p style={{ marginTop: 0, fontWeight: 'bold', color: '#28a745' }}>
                        ✓ You can now request AI assistance!
                      </p>
                      <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                        Current Mode: <strong>{getModeName(student?.currentMode || 1)}</strong>
                      </p>
                      <textarea
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder="Ask a question or describe what you need help with..."
                        rows={3}
                        className="ai-query-input"
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          marginBottom: '10px',
                          fontSize: '1rem'
                        }}
                      />
                      <button
                        onClick={requestAIHelp}
                        className="btn-primary"
                        disabled={aiRequesting}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          background: '#667eea',
                          border: 'none',
                          borderRadius: '4px',
                          color: 'white',
                          cursor: aiRequesting ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {aiRequesting ? '🔄 Requesting...' : `🤖 Get AI Help (${getModeName(student?.currentMode || 1)} Mode)`}
        </button>
                    </div>
                  )}

                  {aiResponse && (
                    <div className="ai-response">
                      <div className="ai-response-header">
                        <strong>AI Response ({getModeName(student?.currentMode || 1)} Mode):</strong>
                      </div>
                      <div className="ai-response-content">{aiResponse}</div>
                      <button 
                        onClick={() => setShowReflection('during')} 
                        className="btn-secondary btn-sm"
                      >
                        Reflect on This Interaction
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'analytics' && analytics && (
          <div className="analytics-view">
            <h2>Your Analytics</h2>
            <div className="analytics-grid">
              <div className="metric-card">
                <h3>AI Dependency Index</h3>
                <div className={`metric-value adi-${analytics.adiZone}`}>
                  {analytics.currentADI.toFixed(1)}
                </div>
                <p className="metric-label">{analytics.adiZone.toUpperCase()} ZONE</p>
              </div>
              
              <div className="metric-card">
                <h3>Current Mode</h3>
                <div className="metric-value">{analytics.modeName}</div>
                <p className="metric-label">Mode {analytics.currentMode}</p>
              </div>
              
              <div className="metric-card">
                <h3>Performance Gap</h3>
                <div className="metric-value">
                  {(analytics.performanceGap * 100).toFixed(1)}%
                </div>
                <p className="metric-label">With AI vs Without AI</p>
              </div>
              
              <div className="metric-card">
                <h3>Success Rate (With AI)</h3>
                <div className="metric-value">
                  {(analytics.successRateWithAI * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="metric-card">
                <h3>Success Rate (Without AI)</h3>
                <div className="metric-value">
                  {(analytics.successRateWithoutAI * 100).toFixed(1)}%
                </div>
      </div>
      
              <div className="metric-card">
                <h3>Transfer Performance</h3>
                <div className="metric-value">
                  {(analytics.transferPerformance * 100).toFixed(1)}%
                </div>
                <p className="metric-label">Novel problems without AI</p>
              </div>
            </div>

            <div style={{ marginTop: '30px' }}>
              <ADIHistoryChart studentId={studentId} days={30} />
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <CoachDashboard />
        )}
      </main>

      {/* Research Consent Component */}
      <ResearchConsent
        userId={studentId}
        requireConsent={false}
        onConsentComplete={(consented) => {
          console.log('Research consent:', consented ? 'Given' : 'Declined');
        }}
      />

      {/* Plagiarism Warning Modal */}
      {showPlagiarismWarning && plagiarismResult && (
        <div className="modal-overlay" onClick={() => setShowPlagiarismWarning(false)}>
          <div className="modal-content plagiarism-warning" onClick={(e) => e.stopPropagation()}>
            <h2>⚠️ Plagiarism Detection Alert</h2>
            <p>
              Our system has detected significant similarity between your code and other sources
              (similarity score: {(plagiarismResult.similarityScore * 100).toFixed(1)}%).
            </p>

            {plagiarismResult.matches && plagiarismResult.matches.length > 0 && (
              <div className="plagiarism-matches">
                <h3>Detected Matches:</h3>
                <ul>
                  {plagiarismResult.matches.map((match: any, idx: number) => (
                    <li key={idx}>
                      {match.type === 'student_similarity' && (
                        <>Similar to code from another student (similarity: {(match.similarity * 100).toFixed(1)}%)</>
                      )}
                      {match.type === 'ai_response_similarity' && (
                        <>Similar to AI-generated code from your chat history (similarity: {(match.similarity * 100).toFixed(1)}%)</>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="plagiarism-note">
              <strong>Important:</strong> This detection is for research and learning purposes.
              While your submission has been recorded, please ensure you're writing original code
              and truly understanding the solutions.
            </p>

            <button
              className="btn-primary"
              onClick={() => setShowPlagiarismWarning(false)}
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
