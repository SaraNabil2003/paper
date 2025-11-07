// Enhanced PSF Server with PostgreSQL, Authentication, WebSocket, and Code Execution
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');

// Import modules
const db = require('./database-facade');
const authRoutes = require('./auth-routes');
const codeRoutes = require('./code-routes');
const ws = require('./websocket-server');
const executor = require('./code-executor');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for development
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Mode-specific system prompts
const MODE_PROMPTS = {
  1: `You are a competitive programming tutor providing HINT-BASED support (Mode 1 - Maximum Support).

CRITICAL RULES:
- Provide ONLY strategic guidance and questions
- NO code implementations
- NO pseudocode
- NO direct solutions
- Ask Socratic questions that guide problem decomposition
- Highlight relevant algorithms/data structures conceptually
- Help students think through the approach themselves

Your role: Thinking partner that scaffolds problem-solving through questions.`,

  2: `You are a competitive programming tutor providing CONCEPTUAL support (Mode 2 - Moderate Support).

CRITICAL RULES:
- Explain algorithmic concepts and approaches
- You MAY provide pseudocode (not working code)
- Explain time/space complexity
- Describe step-by-step conceptual walkthroughs
- Warn about common pitfalls
- NO language-specific implementations
- NO working code

Your role: Textbook that provides conceptual clarity while requiring independent implementation.`,

  3: `You are a competitive programming tutor providing MINIMAL support (Mode 3 - Low Support).

CRITICAL RULES:
- Provide solution verification ONLY
- Identify bugs without fixing them
- Analyze complexity of submitted code
- Ask Socratic questions promoting reflection
- NO new problem-solving information
- NO hints about approaches
- NO code suggestions

Your role: Code reviewer ensuring correctness without providing solutions.`
};

// OpenAI API call function
async function callOpenAI(mode, userQuery, problemContext) {
  if (!OPENAI_API_KEY) {
    const fallbacks = {
      1: "Think about the problem structure. What data do you have? What are you trying to find? Consider: what algorithms work well with this type of input/output relationship?",
      2: "This problem can be solved using a hash map approach. Pseudocode: 1) Create empty map, 2) Iterate through array, 3) For each element, check if complement exists in map, 4) If found, return indices, else store current element. Time: O(n), Space: O(n).",
      3: "I can help verify your solution. Please share your code and I'll check for correctness and complexity."
    };
    return fallbacks[mode] || "AI assistance is not configured. Please set OPENAI_API_KEY environment variable.";
  }

  try {
    const systemPrompt = MODE_PROMPTS[mode] || MODE_PROMPTS[1];
    const fullPrompt = `${problemContext}\n\nStudent question: ${userQuery}`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    const data = await response.json();
    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error('OpenAI API error:', error);
    return "I'm having trouble connecting to the AI service. Please try again or contact support.";
  }
}

// ============ API Routes ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: db.isUsingPostgres() ? 'postgresql' : 'in-memory',
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Code execution routes
app.use('/api/code', codeRoutes);

// Student Management
app.get('/api/student/:id', async (req, res) => {
  const student = await db.getStudent(parseInt(req.params.id));
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }
  res.json(student);
});

// Problem Management
app.get('/api/problems', async (req, res) => {
  const problems = await db.getProblems();
  res.json(problems);
});

app.get('/api/problems/:id', async (req, res) => {
  const problem = await db.getProblem(parseInt(req.params.id));
  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }
  res.json(problem);
});

// Test cases for a problem
app.get('/api/problems/:id/tests', async (req, res) => {
  const testCases = await db.getTestCases(parseInt(req.params.id));
  res.json(testCases);
});

// Session Management
app.post('/api/session/start', async (req, res) => {
  try {
    const { studentId, problemId } = req.body;

    if (studentId === undefined || problemId === undefined) {
      return res.status(400).json({
        error: 'studentId and problemId required'
      });
    }

    const session = await db.startSession(parseInt(studentId), parseInt(problemId));

    if (!session) {
      return res.status(500).json({ error: 'Failed to create session' });
    }

    // Notify via WebSocket
    ws.notifySessionStarted(parseInt(studentId), session);

    res.json({ success: true, session });
  } catch (error) {
    console.error('Error in /api/session/start:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.get('/api/session/:studentId', async (req, res) => {
  const session = await db.getSession(parseInt(req.params.studentId));
  res.json(session || { error: 'No active session' });
});

app.post('/api/session/update', async (req, res) => {
  const { studentId, updates } = req.body;
  const session = await db.updateSession(parseInt(studentId), updates);
  res.json({ success: true, session });
});

// AI Assistance
app.post('/api/ai/request', async (req, res) => {
  const { studentId, problemId, userQuery, timeElapsed } = req.body;

  if (!studentId || !problemId) {
    return res.status(400).json({ error: 'studentId and problemId required' });
  }

  const student = await db.getStudent(parseInt(studentId));
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const session = await db.getSession(parseInt(studentId));
  if (!session) {
    return res.status(400).json({ error: 'No active session' });
  }

  // Struggle-first protocol
  const problem = await db.getProblem(parseInt(problemId));
  const minStruggleTime = problem && problem.difficulty === 'Easy' ? 900 : 1800;

  if (timeElapsed < minStruggleTime) {
    return res.status(403).json({
      error: 'Struggle-first protocol',
      message: `You must work on this problem for at least ${Math.floor(minStruggleTime / 60)} minutes before requesting AI help.`,
      remainingTime: minStruggleTime - timeElapsed
    });
  }

  if (session.submission_attempts === 0 && session.submissionAttempts === 0) {
    return res.status(403).json({
      error: 'Submission required',
      message: 'You must submit at least one solution attempt before requesting AI help.'
    });
  }

  if (student.adi > 7.5) {
    return res.status(403).json({
      error: 'High dependency detected',
      message: 'Your AI Dependency Index is too high (>7.5). Please complete some AI-free practice problems first.',
      adi: student.adi
    });
  }

  const problemContext = problem
    ? `Problem: ${problem.title}\nDescription: ${problem.description}\nDifficulty: ${problem.difficulty}`
    : '';

  const mode = student.currentMode || student.current_mode;
  const aiResponse = await callOpenAI(mode, userQuery || 'I need help with this problem.', problemContext);

  const interaction = await db.recordAIInteraction(parseInt(studentId), {
    problemId: parseInt(problemId),
    sessionId: session.id,
    timeElapsed,
    mode,
    query: userQuery,
    response: aiResponse
  });

  await db.updateSession(parseInt(studentId), {
    aiRequested: true,
    aiAccessGranted: true,
    lastAIInteraction: Date.now()
  });

  // Notify via WebSocket
  ws.notifyAIInteraction(parseInt(studentId), interaction);

  res.json({
    success: true,
    response: aiResponse,
    mode,
    modeName: mode === 1 ? 'Hint-Based' : mode === 2 ? 'Conceptual' : 'Minimal',
    interaction
  });
});

// Record Attempt
app.post('/api/attempt', async (req, res) => {
  const { studentId, problemId, success, withAI, timeSpent } = req.body;

  const attempt = await db.recordAttempt(parseInt(studentId), {
    problemId: parseInt(problemId),
    success: success === true,
    withAI: withAI === true,
    timeSpent: parseInt(timeSpent) || 0,
    mode: withAI ? (await db.getStudent(parseInt(studentId)))?.currentMode : null
  });

  const progression = await db.checkModeProgression(parseInt(studentId));
  const updatedStudent = await db.getStudent(parseInt(studentId));

  // Notify via WebSocket
  ws.notifyAttemptRecorded(parseInt(studentId), attempt);

  if (progression.shouldProgress) {
    ws.notifyModeProgression(parseInt(studentId), progression);
  }

  const adiZone = updatedStudent.adi < 2.5 ? 'healthy' :
                  updatedStudent.adi < 5.0 ? 'moderate' :
                  updatedStudent.adi < 7.5 ? 'high' : 'critical';

  ws.notifyADIUpdated(parseInt(studentId), updatedStudent.adi, adiZone);

  res.json({
    success: true,
    attempt,
    progression,
    updatedStudent
  });
});

// Record Reflection
app.post('/api/reflection', async (req, res) => {
  const { studentId, problemId, stage, content, quality } = req.body;

  if (!['pre-solving', 'during', 'post-solving'].includes(stage)) {
    return res.status(400).json({
      error: 'Invalid stage. Must be: pre-solving, during, or post-solving'
    });
  }

  const reflection = await db.recordReflection(parseInt(studentId), {
    problemId: parseInt(problemId),
    stage,
    content,
    quality: parseInt(quality) || 1
  });

  // Notify via WebSocket
  ws.notifyReflectionSubmitted(parseInt(studentId), reflection);

  res.json({ success: true, reflection });
});

// Dashboard (for coaches)
app.get('/api/dashboard', async (req, res) => {
  const data = await db.getDashboardData();
  res.json(data);
});

// Student Analytics
app.get('/api/analytics/:studentId', async (req, res) => {
  const student = await db.getStudent(parseInt(req.params.studentId));
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const progression = await db.checkModeProgression(parseInt(req.params.studentId));
  const updatedStudent = await db.getStudent(parseInt(req.params.studentId));
  const adiHistory = await db.getADIHistory(parseInt(req.params.studentId), 30);

  const currentADI = updatedStudent.adi || updatedStudent.currentMode;
  const analytics = {
    currentADI,
    adiZone: currentADI < 2.5 ? 'healthy' : currentADI < 5.0 ? 'moderate' : currentADI < 7.5 ? 'high' : 'critical',
    performanceGap: (updatedStudent.performanceWithAI || updatedStudent.performance_with_ai || 0) -
                    (updatedStudent.performanceWithoutAI || updatedStudent.performance_without_ai || 0),
    currentMode: updatedStudent.currentMode || updatedStudent.current_mode,
    modeName: (updatedStudent.currentMode || updatedStudent.current_mode) === 1 ? 'Hint-Based' :
              (updatedStudent.currentMode || updatedStudent.current_mode) === 2 ? 'Conceptual' : 'Minimal',
    totalProblems: (await db.getAttempts(parseInt(req.params.studentId))).length,
    successRateWithAI: updatedStudent.performanceWithAI || updatedStudent.performance_with_ai || 0,
    successRateWithoutAI: updatedStudent.performanceWithoutAI || updatedStudent.performance_without_ai || 0,
    transferPerformance: updatedStudent.transferPerformance || updatedStudent.transfer_performance || 0,
    consultationFrequency: updatedStudent.consultationFrequency || updatedStudent.consultation_frequency || 0,
    earlyConsultationRatio: updatedStudent.earlyConsultationRatio || updatedStudent.early_consultation_ratio || 0,
    reflections: (await db.getReflections(parseInt(req.params.studentId))).length,
    adiHistory,
    progression
  };

  res.json(analytics);
});

// Mode Progression Check
app.get('/api/progression/:studentId', async (req, res) => {
  const progression = await db.checkModeProgression(parseInt(req.params.studentId));
  const student = await db.getStudent(parseInt(req.params.studentId));

  res.json({
    progression,
    currentMode: student?.currentMode || student?.current_mode,
    modeName: (student?.currentMode || student?.current_mode) === 1 ? 'Hint-Based' :
              (student?.currentMode || student?.current_mode) === 2 ? 'Conceptual' : 'Minimal'
  });
});

// WebSocket stats
app.get('/api/ws/stats', (req, res) => {
  res.json(ws.getStats());
});

// ============ Server Initialization ============

async function startServer() {
  const PORT = process.env.PORT || 5000;

  try {
    // Initialize database
    console.log('🔧 Initializing database...');
    await db.initializeDatabase();

    // Initialize code executor temp directory
    console.log('🔧 Initializing code executor...');
    await executor.ensureTempDir();

    // Initialize WebSocket server
    console.log('🔧 Initializing WebSocket server...');
    ws.initializeWebSocket(server);

    // Start HTTP server
    server.listen(PORT, () => {
      console.log('\n🚀 PSF Server Started Successfully!\n');
      console.log(`   HTTP Server: http://localhost:${PORT}`);
      console.log(`   WebSocket:   ws://localhost:${PORT}/ws`);
      console.log(`   Database:    ${db.isUsingPostgres() ? 'PostgreSQL' : 'In-Memory'}`);
      console.log(`   OpenAI:      ${OPENAI_API_KEY ? 'Configured' : 'Disabled (using fallbacks)'}`);
      console.log('\n📚 API Documentation:');
      console.log('   /api/health          - Health check');
      console.log('   /api/auth/*          - Authentication');
      console.log('   /api/code/*          - Code execution');
      console.log('   /api/problems        - Problems list');
      console.log('   /api/dashboard       - Coach dashboard');
      console.log('\n');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();
