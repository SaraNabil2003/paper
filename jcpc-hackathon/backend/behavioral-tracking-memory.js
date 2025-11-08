// In-Memory Behavioral Tracking (for testing without PostgreSQL)

// In-memory storage
const behavioralEvents = [];
const plagiarismChecks = [];
const researchConsents = new Map();
let eventIdCounter = 1;
let checkIdCounter = 1;

/**
 * Record a behavioral event (copy, paste, tab switch, focus change)
 */
async function recordBehavioralEvent(userId, eventData) {
  const {
    sessionId,
    problemId,
    eventType,
    metadata = {},
    sessionTimeElapsed = 0
  } = eventData;

  const event = {
    id: eventIdCounter++,
    userId,
    sessionId,
    problemId,
    eventType,
    eventData: metadata,
    sessionTimeElapsed,
    timestamp: new Date().toISOString()
  };

  behavioralEvents.push(event);
  console.log(`[In-Memory] Recorded ${eventType} event for user ${userId}`);

  return { id: event.id, success: true };
}

/**
 * Get behavioral events for a session
 */
async function getSessionBehavioralEvents(sessionId, eventTypes = null) {
  let events = behavioralEvents.filter(e => e.sessionId === sessionId);

  if (eventTypes && eventTypes.length > 0) {
    events = events.filter(e => eventTypes.includes(e.eventType));
  }

  return events;
}

/**
 * Get session activity summary
 */
async function getSessionActivitySummary(sessionId) {
  const events = behavioralEvents.filter(e => e.sessionId === sessionId);

  const summary = {
    sessionId,
    totalPasteEvents: events.filter(e => e.eventType === 'paste').length,
    totalCopyEvents: events.filter(e => e.eventType === 'copy').length,
    totalTabSwitches: events.filter(e => e.eventType === 'tab_switch').length,
    totalFocusLosses: events.filter(e => e.eventType === 'focus_loss').length,
    plagiarismFlagged: false,
    maxSimilarityScore: 0
  };

  return summary;
}

/**
 * Get all behavioral summaries for a user
 */
async function getUserBehavioralSummary(userId, limit = 50) {
  const userEvents = behavioralEvents.filter(e => e.userId === userId);
  const sessionIds = [...new Set(userEvents.map(e => e.sessionId))];

  const summaries = await Promise.all(
    sessionIds.slice(0, limit).map(async sid => {
      const summary = await getSessionActivitySummary(sid);
      return {
        ...summary,
        startTime: new Date().toISOString(),
        problemTitle: 'Test Problem',
        difficulty: 'Medium'
      };
    })
  );

  return summaries;
}

/**
 * Calculate behavioral metrics for a user
 */
async function calculateBehavioralMetrics(userId) {
  const userEvents = behavioralEvents.filter(e => e.userId === userId);
  const sessionIds = [...new Set(userEvents.map(e => e.sessionId))];

  const metrics = {
    total_sessions: sessionIds.length,
    total_pastes: userEvents.filter(e => e.eventType === 'paste').length,
    total_tab_switches: userEvents.filter(e => e.eventType === 'tab_switch').length,
    avg_paste_per_session: sessionIds.length > 0
      ? userEvents.filter(e => e.eventType === 'paste').length / sessionIds.length
      : 0,
    avg_tab_switches_per_session: sessionIds.length > 0
      ? userEvents.filter(e => e.eventType === 'tab_switch').length / sessionIds.length
      : 0,
    avg_focus_losses_per_session: sessionIds.length > 0
      ? userEvents.filter(e => e.eventType === 'focus_loss').length / sessionIds.length
      : 0,
    flagged_sessions: 0,
    avg_similarity_score: 0
  };

  return metrics;
}

/**
 * Simple code similarity calculation (Jaccard similarity on tokens)
 */
function calculateCodeSimilarity(code1, code2) {
  const normalize = (code) => {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
  };

  const normalized1 = normalize(code1);
  const normalized2 = normalize(code2);

  if (normalized1 === normalized2) return 1.0;

  const tokenize = (code) => {
    return new Set(code.split(/\W+/).filter(t => t.length > 0));
  };

  const tokens1 = tokenize(normalized1);
  const tokens2 = tokenize(normalized2);

  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);

  if (union.size === 0) return 0;

  const jaccardSimilarity = intersection.size / union.size;

  const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2;
  const longer = normalized1.length >= normalized2.length ? normalized1 : normalized2;
  const containmentRatio = longer.includes(shorter) ? shorter.length / longer.length : 0;

  return Math.max(jaccardSimilarity, containmentRatio);
}

/**
 * Check for plagiarism by comparing code similarity
 */
async function checkPlagiarism(userId, attemptId, problemId, code) {
  console.log(`[In-Memory] Checking plagiarism for user ${userId}, problem ${problemId}`);

  // For in-memory, we'll do basic similarity check
  const otherChecks = plagiarismChecks.filter(
    c => c.problemId === problemId && c.userId !== userId
  );

  const matches = [];
  let maxSimilarity = 0;

  for (const check of otherChecks) {
    const similarity = calculateCodeSimilarity(code, check.submittedCode);
    if (similarity > 0.7) {
      matches.push({
        type: 'student_similarity',
        userId: check.userId,
        similarity,
        attemptId: check.attemptId
      });
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }

  const isFlagged = maxSimilarity > 0.7;

  const result = {
    id: checkIdCounter++,
    userId,
    attemptId,
    problemId,
    submittedCode: code,
    similarityScore: maxSimilarity,
    matchedSources: matches,
    flagged: isFlagged,
    timestamp: new Date().toISOString()
  };

  plagiarismChecks.push(result);

  console.log(`[In-Memory] Plagiarism check: ${isFlagged ? 'FLAGGED' : 'CLEAR'} (${(maxSimilarity * 100).toFixed(1)}%)`);

  return {
    flagged: isFlagged,
    similarityScore: maxSimilarity,
    matches,
    checkId: result.id
  };
}

/**
 * Get plagiarism report for a user
 */
async function getUserPlagiarismReport(userId) {
  return plagiarismChecks.filter(c => c.userId === userId);
}

/**
 * Get all flagged plagiarism cases
 */
async function getFlaggedPlagiarismCases(limit = 50) {
  return plagiarismChecks
    .filter(c => c.flagged)
    .slice(0, limit)
    .map(c => ({
      ...c,
      student_name: `Student ${c.userId}`,
      email: `student${c.userId}@test.com`,
      problem_title: `Problem ${c.problemId}`
    }));
}

/**
 * Record research consent
 */
async function recordResearchConsent(userId, consentData) {
  const consent = {
    userId,
    ...consentData,
    consentDate: new Date().toISOString()
  };

  researchConsents.set(userId, consent);
  console.log(`[In-Memory] Recorded consent for user ${userId}: ${consentData.consentGiven ? 'GIVEN' : 'DECLINED'}`);

  return consent;
}

/**
 * Get research consent status
 */
async function getResearchConsent(userId) {
  return researchConsents.get(userId) || null;
}

/**
 * Get research analytics
 */
async function getResearchAnalytics(filters = {}) {
  // For in-memory, return empty array
  return [];
}

module.exports = {
  recordBehavioralEvent,
  getSessionBehavioralEvents,
  getSessionActivitySummary,
  getUserBehavioralSummary,
  calculateBehavioralMetrics,
  checkPlagiarism,
  getUserPlagiarismReport,
  getFlaggedPlagiarismCases,
  recordResearchConsent,
  getResearchConsent,
  getResearchAnalytics
};
