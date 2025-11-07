// Code execution routes
const express = require('express');
const router = express.Router();
const executor = require('./code-executor');
const db = require('./database-facade');
const auth = require('./auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for code execution (prevent abuse)
const executionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the code execution rate limit. Please try again later.'
  }
});

// Execute code (single run)
router.post('/execute', executionLimiter, async (req, res) => {
  try {
    const { language, code, input } = req.body;

    if (!language || !code) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Language and code are required'
      });
    }

    const result = await executor.executeCode(language, code, input || '');

    res.json({
      success: result.success,
      output: result.output,
      error: result.error,
      language
    });
  } catch (error) {
    console.error('Code execution error:', error);
    res.status(500).json({
      error: 'Execution error',
      message: error.message
    });
  }
});

// Run test cases for a problem
router.post('/test', executionLimiter, async (req, res) => {
  try {
    const { language, code, problemId } = req.body;

    if (!language || !code || !problemId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Language, code, and problemId are required'
      });
    }

    // Get test cases from database
    const testCases = await db.getTestCases(parseInt(problemId));

    if (!testCases || testCases.length === 0) {
      // Fallback to hardcoded test cases for in-memory mode
      const problem = await db.getProblem(parseInt(problemId));
      if (!problem) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Problem not found'
        });
      }

      // Use basic test cases (this is a fallback)
      const basicTestCases = generateBasicTestCases(parseInt(problemId));
      const result = await executor.runTestCases(language, code, basicTestCases);

      return res.json({
        success: result.success,
        passed: result.passed,
        total: result.total,
        results: result.results
      });
    }

    // Run with database test cases
    const result = await executor.runTestCases(language, code, testCases);

    res.json({
      success: result.success,
      passed: result.passed,
      total: result.total,
      results: result.results
    });
  } catch (error) {
    console.error('Test execution error:', error);
    res.status(500).json({
      error: 'Execution error',
      message: error.message
    });
  }
});

// Submit solution (run tests + record attempt)
router.post('/submit', auth.optionalAuth, executionLimiter, async (req, res) => {
  try {
    const { studentId, problemId, language, code, withAI } = req.body;

    if (!studentId || !problemId || !language || !code) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'studentId, problemId, language, and code are required'
      });
    }

    // Get test cases
    const testCases = await db.getTestCases(parseInt(problemId));
    const testCasesToUse = testCases.length > 0
      ? testCases
      : generateBasicTestCases(parseInt(problemId));

    // Run tests
    const result = await executor.runTestCases(language, code, testCasesToUse);

    // Get session for time tracking
    const session = await db.getSession(parseInt(studentId));
    const timeSpent = session
      ? Math.floor((Date.now() - session.start_time) / 1000)
      : 0;

    // Record attempt
    const attempt = await db.recordAttempt(parseInt(studentId), {
      problemId: parseInt(problemId),
      sessionId: session?.id,
      success: result.success,
      withAI: withAI === true,
      timeSpent,
      codeSubmitted: code,
      language
    });

    // Check mode progression
    const progression = await db.checkModeProgression(parseInt(studentId));

    res.json({
      success: true,
      testResults: {
        passed: result.passed,
        total: result.total,
        allPassed: result.success,
        results: result.results
      },
      attempt,
      progression
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({
      error: 'Submission error',
      message: error.message
    });
  }
});

// Check language support
router.get('/languages', async (req, res) => {
  const languages = ['javascript', 'python', 'cpp', 'java'];
  const supported = {};

  for (const lang of languages) {
    supported[lang] = await executor.checkLanguageSupport(lang);
  }

  res.json({
    languages: supported,
    available: Object.entries(supported)
      .filter(([_, isSupported]) => isSupported)
      .map(([lang]) => lang)
  });
});

// Fallback test cases generator (for in-memory mode)
function generateBasicTestCases(problemId) {
  const testCases = {
    1: [ // Two Sum
      { input: '[2,7,11,15]\n9', expected_output: '[0,1]' },
      { input: '[3,2,4]\n6', expected_output: '[1,2]' },
      { input: '[3,3]\n6', expected_output: '[0,1]' }
    ],
    2: [ // Binary Search
      { input: '[-1,0,3,5,9,12]\n9', expected_output: '4' },
      { input: '[-1,0,3,5,9,12]\n2', expected_output: '-1' },
      { input: '[5]\n5', expected_output: '0' }
    ]
  };

  return testCases[problemId] || [
    { input: '', expected_output: '' }
  ];
}

module.exports = router;
