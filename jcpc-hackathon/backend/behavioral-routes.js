// API Routes for Behavioral Tracking
const express = require('express');
const router = express.Router();

// Try to use PostgreSQL version, fallback to in-memory
let behavioral;
try {
  const dbFacade = require('./database-facade');
  if (dbFacade.isUsingPostgres && dbFacade.isUsingPostgres()) {
    behavioral = require('./behavioral-tracking');
    console.log('✅ Using PostgreSQL for behavioral tracking');
  } else {
    behavioral = require('./behavioral-tracking-memory');
    console.log('⚠️  Using in-memory storage for behavioral tracking (data won\'t persist)');
  }
} catch (error) {
  behavioral = require('./behavioral-tracking-memory');
  console.log('⚠️  Using in-memory storage for behavioral tracking (data won\'t persist)');
}

/**
 * POST /api/behavioral/event
 * Record a behavioral event (copy, paste, tab switch, focus change)
 */
router.post('/event', async (req, res) => {
  try {
    const { userId, sessionId, problemId, eventType, metadata, sessionTimeElapsed } = req.body;

    if (!userId || !sessionId || !problemId || !eventType) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'sessionId', 'problemId', 'eventType']
      });
    }

    const validEventTypes = [
      'copy', 'paste', 'tab_switch', 'focus_loss', 'focus_gain',
      'window_blur', 'window_focus'
    ];

    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        error: 'Invalid event type',
        validTypes: validEventTypes
      });
    }

    const result = await behavioral.recordBehavioralEvent(userId, {
      sessionId,
      problemId,
      eventType,
      metadata: metadata || {},
      sessionTimeElapsed: sessionTimeElapsed || 0
    });

    res.json({
      success: true,
      eventId: result.id,
      message: 'Behavioral event recorded'
    });
  } catch (error) {
    console.error('Error recording behavioral event:', error);
    res.status(500).json({
      error: 'Failed to record behavioral event',
      message: error.message
    });
  }
});

/**
 * POST /api/behavioral/events/batch
 * Record multiple behavioral events at once (for batching)
 */
router.post('/events/batch', async (req, res) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'events array required' });
    }

    const results = [];
    for (const event of events) {
      try {
        const result = await behavioral.recordBehavioralEvent(event.userId, {
          sessionId: event.sessionId,
          problemId: event.problemId,
          eventType: event.eventType,
          metadata: event.metadata || {},
          sessionTimeElapsed: event.sessionTimeElapsed || 0
        });
        results.push({ success: true, eventId: result.id });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      recorded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    console.error('Error in batch event recording:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/behavioral/session/:sessionId
 * Get all behavioral events for a session
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const eventTypes = req.query.types ? req.query.types.split(',') : null;

    const events = await behavioral.getSessionBehavioralEvents(sessionId, eventTypes);
    const summary = await behavioral.getSessionActivitySummary(sessionId);

    res.json({
      sessionId,
      events,
      summary,
      eventCount: events.length
    });
  } catch (error) {
    console.error('Error fetching session behavioral data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/behavioral/summary/:sessionId
 * Get activity summary for a session
 */
router.get('/summary/:sessionId', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const summary = await behavioral.getSessionActivitySummary(sessionId);

    if (!summary) {
      return res.status(404).json({ error: 'Session summary not found' });
    }

    res.json(summary);
  } catch (error) {
    console.error('Error fetching session summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/behavioral/user/:userId
 * Get behavioral summary for all sessions of a user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit) || 50;

    const sessions = await behavioral.getUserBehavioralSummary(userId, limit);
    const metrics = await behavioral.calculateBehavioralMetrics(userId);

    res.json({
      userId,
      sessions,
      metrics,
      sessionCount: sessions.length
    });
  } catch (error) {
    console.error('Error fetching user behavioral data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/behavioral/plagiarism/check
 * Check code for plagiarism
 */
router.post('/plagiarism/check', async (req, res) => {
  try {
    const { userId, attemptId, problemId, code } = req.body;

    if (!userId || !attemptId || !problemId || !code) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'attemptId', 'problemId', 'code']
      });
    }

    const result = await behavioral.checkPlagiarism(
      parseInt(userId),
      parseInt(attemptId),
      parseInt(problemId),
      code
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in plagiarism check:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/behavioral/plagiarism/user/:userId
 * Get plagiarism report for a user
 */
router.get('/plagiarism/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const report = await behavioral.getUserPlagiarismReport(userId);

    res.json({
      userId,
      checks: report,
      totalChecks: report.length,
      flaggedCount: report.filter(r => r.flagged).length
    });
  } catch (error) {
    console.error('Error fetching plagiarism report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/behavioral/plagiarism/flagged
 * Get all flagged plagiarism cases (for coach dashboard)
 */
router.get('/plagiarism/flagged', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const cases = await behavioral.getFlaggedPlagiarismCases(limit);

    res.json({
      cases,
      count: cases.length
    });
  } catch (error) {
    console.error('Error fetching flagged cases:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/behavioral/consent
 * Record research consent
 */
router.post('/consent', async (req, res) => {
  try {
    const {
      userId,
      consentGiven,
      canUseForResearch,
      canShareAnonymized
    } = req.body;

    if (userId === undefined || consentGiven === undefined) {
      return res.status(400).json({
        error: 'userId and consentGiven required'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;

    const consentText = `
Progressive Scaffolding Framework Research Study - Informed Consent

By participating in this study, you consent to:
1. Collection of your problem-solving activities and AI usage patterns
2. Collection of behavioral data (copy-paste events, tab switches, focus changes)
3. Analysis of your code submissions for plagiarism detection
4. Use of anonymized data for research publications

You may withdraw consent at any time. Your data will be stored securely and used only for research purposes.
    `.trim();

    const consent = await behavioral.recordResearchConsent(parseInt(userId), {
      consentGiven,
      canUseForResearch: canUseForResearch !== false, // default true if consented
      canShareAnonymized: canShareAnonymized !== false, // default true if consented
      ipAddress,
      consentText
    });

    res.json({
      success: true,
      consent
    });
  } catch (error) {
    console.error('Error recording consent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/behavioral/consent/:userId
 * Get research consent status
 */
router.get('/consent/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const consent = await behavioral.getResearchConsent(userId);

    if (!consent) {
      return res.json({
        hasConsent: false,
        message: 'No consent record found'
      });
    }

    res.json({
      hasConsent: true,
      consent
    });
  } catch (error) {
    console.error('Error fetching consent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/behavioral/research/analytics
 * Get research analytics (only consented users)
 */
router.get('/research/analytics', async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId) : undefined,
      minADI: req.query.minADI ? parseFloat(req.query.minADI) : undefined,
      plagiarismFlagged: req.query.plagiarismFlagged === 'true' ? true : undefined
    };

    const analytics = await behavioral.getResearchAnalytics(filters);

    res.json({
      analytics,
      count: analytics.length,
      filters
    });
  } catch (error) {
    console.error('Error fetching research analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/behavioral/stats
 * Get overall behavioral tracking statistics (for coach dashboard)
 */
router.get('/stats', async (req, res) => {
  try {
    // This would query aggregate statistics across all users
    // For now, return a placeholder
    res.json({
      message: 'Behavioral tracking statistics',
      note: 'Query specific users or sessions for detailed data'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
