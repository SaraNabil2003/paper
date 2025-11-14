const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
app.use(cors());

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Body parsing middleware (must come before routes)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log requests (after body parsing)
app.use((req, res, next) => {
  if (req.path === '/api/session/start') {
    console.log('=== Request Debug ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body:', req.body);
    console.log('Body type:', typeof req.body);
    console.log('Body keys:', req.body ? Object.keys(req.body) : 'null/undefined');
    console.log('===================');
  }
  next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Allow unauthenticated access for demo purposes
    // In production, uncomment the next line
    // return res.status(401).json({ error: 'Access token required' });
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'Role must be student or teacher' });
    }

    // Check if user already exists
    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = db.createUser({ email, password, name, role });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    // Find user
    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check role
    if (user.role !== role) {
      return res.status(401).json({ error: `This account is not registered as a ${role}` });
    }

    // Verify password (in production, use bcrypt)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout (client-side token removal, but we can add token blacklisting if needed)
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// OpenAI API integration (requires OPENAI_API_KEY environment variable)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Mode-specific system prompts based on PSF framework
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

async function callOpenAI(mode, userQuery, problemContext) {
  if (!OPENAI_API_KEY) {
    // Fallback responses for demo without API key
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
        temperature: 0.3, // Lower temperature for consistency
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

// Get student data
app.get('/api/student/:id', (req, res) => {
  const student = db.getStudent(parseInt(req.params.id));
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }
  res.json(student);
});

// Get all problems
app.get('/api/problems', (req, res) => {
  res.json(db.getProblems());
});

// Get specific problem
app.get('/api/problems/:id', (req, res) => {
  const problem = db.getProblem(parseInt(req.params.id));
  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }
  res.json(problem);
});

// Start problem-solving session
app.post('/api/session/start', (req, res) => {
  try {
    console.log('Session start request body:', req.body);
    console.log('Request headers:', req.headers);
    
    const { studentId, problemId } = req.body;
    
    if (studentId === undefined || studentId === null || problemId === undefined || problemId === null) {
      console.error('Missing required fields:', { studentId, problemId, body: req.body });
      return res.status(400).json({ 
        error: 'studentId and problemId required',
        received: { studentId, problemId },
        body: req.body
      });
    }
    
    const parsedStudentId = parseInt(studentId);
    const parsedProblemId = parseInt(problemId);
    
    if (isNaN(parsedStudentId) || isNaN(parsedProblemId)) {
      console.error('Invalid number format:', { studentId, problemId, parsedStudentId, parsedProblemId });
      return res.status(400).json({ 
        error: 'studentId and problemId must be valid numbers',
        received: { studentId, problemId },
        parsed: { parsedStudentId, parsedProblemId }
      });
    }
    
    console.log('Calling db.startSession with:', { parsedStudentId, parsedProblemId });
    const session = db.startSession(parsedStudentId, parsedProblemId);
    console.log('Session created:', session);
    
    if (!session) {
      console.error('db.startSession returned null/undefined');
      return res.status(500).json({ error: 'Failed to create session' });
    }
    
    res.json({ success: true, session });
  } catch (error) {
    console.error('Error in /api/session/start:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get current session
app.get('/api/session/:studentId', (req, res) => {
  const session = db.getSession(parseInt(req.params.studentId));
  res.json(session || { error: 'No active session' });
});

// Update session (e.g., record submission attempt)
app.post('/api/session/update', (req, res) => {
  const { studentId, updates } = req.body;
  const session = db.updateSession(parseInt(studentId), updates);
  res.json({ success: true, session });
});

// Request AI assistance (with struggle-first protocol)
app.post('/api/ai/request', async (req, res) => {
  const { studentId, problemId, userQuery, timeElapsed } = req.body;
  
  if (!studentId || !problemId) {
    return res.status(400).json({ error: 'studentId and problemId required' });
  }

  const student = db.getStudent(parseInt(studentId));
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const session = db.getSession(parseInt(studentId));
  if (!session) {
    return res.status(400).json({ error: 'No active session' });
  }

  // Struggle-first protocol: minimum 15 minutes (900 seconds) for easy, 30 min (1800) for medium+
  const problem = db.getProblem(parseInt(problemId));
  const minStruggleTime = problem && problem.difficulty === 'Easy' ? 900 : 1800;
  
  if (timeElapsed < minStruggleTime) {
    return res.status(403).json({ 
      error: 'Struggle-first protocol',
      message: `You must work on this problem for at least ${Math.floor(minStruggleTime / 60)} minutes before requesting AI help.`,
      remainingTime: minStruggleTime - timeElapsed
    });
  }

  // Check if at least one submission attempt
  if (session.submissionAttempts === 0) {
    return res.status(403).json({ 
      error: 'Submission required',
      message: 'You must submit at least one solution attempt before requesting AI help.'
    });
  }

  // Check ADI-based restrictions
  if (student.adi > 7.5) {
    return res.status(403).json({ 
      error: 'High dependency detected',
      message: 'Your AI Dependency Index is too high (>7.5). Please complete some AI-free practice problems first.',
      adi: student.adi
    });
  }

  // Get problem context
  const problemContext = problem 
    ? `Problem: ${problem.title}\nDescription: ${problem.description}\nDifficulty: ${problem.difficulty}`
    : '';

  // Call OpenAI with appropriate mode
  const mode = student.currentMode;
  const aiResponse = await callOpenAI(mode, userQuery || 'I need help with this problem.', problemContext);

  // Record AI interaction
  const interaction = db.recordAIInteraction(parseInt(studentId), {
    problemId: parseInt(problemId),
    timeElapsed,
    mode,
    query: userQuery,
    response: aiResponse
  });

  // Update session
  db.updateSession(parseInt(studentId), {
    aiRequested: true,
    aiAccessGranted: true,
    lastAIInteraction: Date.now()
  });

  res.json({ 
    success: true,
    response: aiResponse,
    mode,
    modeName: mode === 1 ? 'Hint-Based' : mode === 2 ? 'Conceptual' : 'Minimal',
    interaction
  });
});

// Record problem attempt
app.post('/api/attempt', (req, res) => {
  const { studentId, problemId, success, withAI, timeSpent } = req.body;
  
  const attempt = db.recordAttempt(parseInt(studentId), {
    problemId: parseInt(problemId),
    success: success === true,
    withAI: withAI === true,
    timeSpent: parseInt(timeSpent) || 0,
    mode: withAI ? db.getStudent(parseInt(studentId))?.currentMode : null
  });

  // Check for mode progression
  const progression = db.checkModeProgression(parseInt(studentId));

  res.json({ 
    success: true, 
    attempt,
    progression,
    updatedStudent: db.getStudent(parseInt(studentId))
  });
});

// Record reflection
app.post('/api/reflection', (req, res) => {
  const { studentId, problemId, stage, content, quality } = req.body;
  
  if (!['pre-solving', 'during', 'post-solving'].includes(stage)) {
    return res.status(400).json({ error: 'Invalid stage. Must be: pre-solving, during, or post-solving' });
  }

  const reflection = db.recordReflection(parseInt(studentId), {
    problemId: parseInt(problemId),
    stage,
    content,
    quality: parseInt(quality) || 1
  });

  res.json({ success: true, reflection });
});

// Get dashboard data (for coaches)
app.get('/api/dashboard', (req, res) => {
  const students = db.getStudents();
  const averageADI = students.length > 0
    ? students.reduce((acc, s) => acc + s.adi, 0) / students.length
    : 0;
  
  const flaggedStudents = students.filter(s => s.adi > 7.0);
  
  res.json({
    students,
    averageADI: Math.round(averageADI * 10) / 10,
    flaggedStudents,
    totalStudents: students.length,
    modeDistribution: {
      mode1: students.filter(s => s.currentMode === 1).length,
      mode2: students.filter(s => s.currentMode === 2).length,
      mode3: students.filter(s => s.currentMode === 3).length
    }
  });
});

// Get student analytics
app.get('/api/analytics/:studentId', (req, res) => {
  const student = db.getStudent(parseInt(req.params.studentId));
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  // Check for mode progression
  const progression = db.checkModeProgression(parseInt(req.params.studentId));
  
  // Re-fetch student in case mode changed
  const updatedStudent = db.getStudent(parseInt(req.params.studentId));

  // Calculate trends
  const recentAttempts = updatedStudent.attempts.slice(-20);
  const recentADI = updatedStudent.adi;
  
  const analytics = {
    currentADI: recentADI,
    adiZone: recentADI < 2.5 ? 'healthy' : recentADI < 5.0 ? 'moderate' : recentADI < 7.5 ? 'high' : 'critical',
    performanceGap: updatedStudent.performanceWithAI - updatedStudent.performanceWithoutAI,
    currentMode: updatedStudent.currentMode,
    modeName: updatedStudent.currentMode === 1 ? 'Hint-Based' : updatedStudent.currentMode === 2 ? 'Conceptual' : 'Minimal',
    totalProblems: updatedStudent.attempts.length,
    successRateWithAI: updatedStudent.performanceWithAI,
    successRateWithoutAI: updatedStudent.performanceWithoutAI,
    transferPerformance: updatedStudent.transferPerformance,
    consultationFrequency: updatedStudent.consultationFrequency,
    earlyConsultationRatio: updatedStudent.earlyConsultationRatio,
    recentAttempts: recentAttempts.length,
    reflections: updatedStudent.reflections.length,
    progression: progression // Include progression info
  };

  res.json(analytics);
});

// Check mode progression (can be called independently)
app.get('/api/progression/:studentId', (req, res) => {
  const progression = db.checkModeProgression(parseInt(req.params.studentId));
  const student = db.getStudent(parseInt(req.params.studentId));
  
  res.json({
    progression,
    currentMode: student?.currentMode,
    modeName: student?.currentMode === 1 ? 'Hint-Based' : student?.currentMode === 2 ? 'Conceptual' : 'Minimal'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`PSF Server running on port ${PORT}`);
  if (!OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not set. AI features will use fallback responses.');
  }
});