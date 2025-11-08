// Behavioral Tracking Module
// Handles copy-paste events, tab switching, and behavioral analytics

const { query, transaction } = require('./db-config');

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

  try {
    const result = await query(
      `SELECT record_behavioral_event($1, $2, $3, $4, $5, $6) as event_id`,
      [
        userId,
        sessionId,
        problemId,
        eventType,
        JSON.stringify(metadata),
        sessionTimeElapsed
      ]
    );

    return { id: result.rows[0].event_id, success: true };
  } catch (error) {
    console.error('Error recording behavioral event:', error);
    // Fallback to direct insert if function doesn't exist
    const result = await query(
      `INSERT INTO behavioral_events (user_id, session_id, problem_id, event_type, event_data, session_time_elapsed)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, sessionId, problemId, eventType, JSON.stringify(metadata), sessionTimeElapsed]
    );
    return { id: result.rows[0].id, success: true };
  }
}

/**
 * Get behavioral events for a session
 */
async function getSessionBehavioralEvents(sessionId, eventTypes = null) {
  let sql = 'SELECT * FROM behavioral_events WHERE session_id = $1';
  const params = [sessionId];

  if (eventTypes && eventTypes.length > 0) {
    sql += ' AND event_type = ANY($2)';
    params.push(eventTypes);
  }

  sql += ' ORDER BY timestamp ASC';

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get session activity summary
 */
async function getSessionActivitySummary(sessionId) {
  const result = await query(
    'SELECT * FROM session_activity_summary WHERE session_id = $1',
    [sessionId]
  );
  return result.rows[0] || null;
}

/**
 * Get all behavioral summaries for a user
 */
async function getUserBehavioralSummary(userId, limit = 50) {
  const result = await query(
    `SELECT sas.*, p.title as problem_title, p.difficulty, s.start_time, s.end_time
     FROM session_activity_summary sas
     JOIN sessions s ON sas.session_id = s.id
     JOIN problems p ON sas.problem_id = p.id
     WHERE sas.user_id = $1
     ORDER BY s.start_time DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

/**
 * Calculate behavioral metrics for a user
 */
async function calculateBehavioralMetrics(userId) {
  const result = await query(
    `SELECT
       COUNT(DISTINCT session_id) as total_sessions,
       AVG(total_paste_events) as avg_paste_per_session,
       AVG(total_tab_switches) as avg_tab_switches_per_session,
       AVG(total_focus_losses) as avg_focus_losses_per_session,
       SUM(total_paste_events) as total_pastes,
       SUM(total_tab_switches) as total_tab_switches,
       SUM(plagiarism_flagged::int) as flagged_sessions,
       AVG(max_similarity_score) as avg_similarity_score
     FROM session_activity_summary
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0];
}

/**
 * Check for plagiarism by comparing code similarity
 */
async function checkPlagiarism(userId, attemptId, problemId, code) {
  // Simple plagiarism detection using Levenshtein-like comparison
  // In production, integrate with external APIs like MOSS or JPlag

  try {
    // Get all previous submissions for this problem by OTHER students
    const otherSubmissions = await query(
      `SELECT a.id, a.user_id, a.code_submitted, u.name
       FROM attempts a
       JOIN users u ON a.user_id = u.id
       WHERE a.problem_id = $1 AND a.user_id != $2 AND a.code_submitted IS NOT NULL
       ORDER BY a.timestamp DESC
       LIMIT 100`,
      [problemId, userId]
    );

    // Get AI responses for this problem from this user's past interactions
    const aiResponses = await query(
      `SELECT response
       FROM ai_interactions
       WHERE user_id = $1 AND problem_id = $2
       ORDER BY timestamp DESC
       LIMIT 20`,
      [userId, problemId]
    );

    const matches = [];
    let maxSimilarity = 0;

    // Check similarity with other students' code
    for (const submission of otherSubmissions.rows) {
      const similarity = calculateCodeSimilarity(code, submission.code_submitted);
      if (similarity > 0.7) { // 70% similarity threshold
        matches.push({
          type: 'student_similarity',
          userId: submission.user_id,
          userName: submission.name,
          similarity,
          attemptId: submission.id
        });
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }

    // Check similarity with AI responses (looking for direct code copying from AI)
    for (const aiResponse of aiResponses.rows) {
      const codeInResponse = extractCodeFromAIResponse(aiResponse.response);
      if (codeInResponse) {
        const similarity = calculateCodeSimilarity(code, codeInResponse);
        if (similarity > 0.8) { // 80% similarity threshold for AI responses
          matches.push({
            type: 'ai_response_similarity',
            similarity
          });
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
      }
    }

    const isFlagged = maxSimilarity > 0.7;

    // Store plagiarism check result
    const result = await query(
      `INSERT INTO plagiarism_checks
       (user_id, attempt_id, problem_id, submitted_code, similarity_score, matched_sources, detection_type, flagged)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        attemptId,
        problemId,
        code,
        maxSimilarity,
        JSON.stringify(matches),
        matches.length > 0 ? matches[0].type : null,
        isFlagged
      ]
    );

    // Update session summary if flagged
    if (isFlagged) {
      await query(
        `UPDATE session_activity_summary sas
         SET plagiarism_flagged = TRUE, max_similarity_score = $1
         FROM attempts a
         WHERE a.id = $2 AND a.session_id = sas.session_id`,
        [maxSimilarity, attemptId]
      );
    }

    return {
      flagged: isFlagged,
      similarityScore: maxSimilarity,
      matches,
      checkId: result.rows[0].id
    };
  } catch (error) {
    console.error('Error in plagiarism check:', error);
    return { flagged: false, similarityScore: 0, matches: [], error: error.message };
  }
}

/**
 * Simple code similarity calculation (Jaccard similarity on tokens)
 */
function calculateCodeSimilarity(code1, code2) {
  // Normalize code: remove comments, whitespace, normalize case
  const normalize = (code) => {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*/g, '') // Remove line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toLowerCase()
      .trim();
  };

  const normalized1 = normalize(code1);
  const normalized2 = normalize(code2);

  // Exact match check
  if (normalized1 === normalized2) return 1.0;

  // Tokenize code (split by non-alphanumeric characters)
  const tokenize = (code) => {
    return new Set(code.split(/\W+/).filter(t => t.length > 0));
  };

  const tokens1 = tokenize(normalized1);
  const tokens2 = tokenize(normalized2);

  // Jaccard similarity: intersection / union
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);

  if (union.size === 0) return 0;

  const jaccardSimilarity = intersection.size / union.size;

  // Also check substring containment (for partial copies)
  const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2;
  const longer = normalized1.length >= normalized2.length ? normalized1 : normalized2;
  const containmentRatio = longer.includes(shorter) ? shorter.length / longer.length : 0;

  // Return maximum of Jaccard and containment ratio
  return Math.max(jaccardSimilarity, containmentRatio);
}

/**
 * Extract code blocks from AI response
 */
function extractCodeFromAIResponse(response) {
  // Extract code from markdown code blocks
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
  const matches = [...response.matchAll(codeBlockRegex)];

  if (matches.length > 0) {
    return matches.map(m => m[1]).join('\n');
  }

  return null;
}

/**
 * Get plagiarism report for a user
 */
async function getUserPlagiarismReport(userId) {
  const result = await query(
    `SELECT pc.*, p.title as problem_title, a.timestamp as attempt_timestamp
     FROM plagiarism_checks pc
     JOIN problems p ON pc.problem_id = p.id
     JOIN attempts a ON pc.attempt_id = a.id
     WHERE pc.user_id = $1
     ORDER BY pc.timestamp DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Get all flagged plagiarism cases for coach dashboard
 */
async function getFlaggedPlagiarismCases(limit = 50) {
  const result = await query(
    `SELECT pc.*, u.name as student_name, u.email, p.title as problem_title
     FROM plagiarism_checks pc
     JOIN users u ON pc.user_id = u.id
     JOIN problems p ON pc.problem_id = p.id
     WHERE pc.flagged = TRUE
     ORDER BY pc.timestamp DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

/**
 * Record research consent
 */
async function recordResearchConsent(userId, consentData) {
  const {
    consentGiven,
    canUseForResearch,
    canShareAnonymized,
    ipAddress,
    consentText
  } = consentData;

  const result = await query(
    `INSERT INTO research_consent
     (user_id, consent_given, consent_date, can_use_for_research, can_share_anonymized, ip_address, consent_text)
     VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET
       consent_given = $2,
       consent_date = CURRENT_TIMESTAMP,
       can_use_for_research = $3,
       can_share_anonymized = $4,
       ip_address = $5,
       consent_text = $6
     RETURNING *`,
    [userId, consentGiven, canUseForResearch, canShareAnonymized, ipAddress, consentText]
  );

  return result.rows[0];
}

/**
 * Get research consent status
 */
async function getResearchConsent(userId) {
  const result = await query(
    'SELECT * FROM research_consent WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Get research analytics (only consented users)
 */
async function getResearchAnalytics(filters = {}) {
  let sql = 'SELECT * FROM research_analytics WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (filters.userId) {
    sql += ` AND user_id = $${paramIndex}`;
    params.push(filters.userId);
    paramIndex++;
  }

  if (filters.minADI !== undefined) {
    sql += ` AND adi >= $${paramIndex}`;
    params.push(filters.minADI);
    paramIndex++;
  }

  if (filters.plagiarismFlagged !== undefined) {
    sql += ` AND plagiarism_flagged = $${paramIndex}`;
    params.push(filters.plagiarismFlagged);
    paramIndex++;
  }

  sql += ' ORDER BY timestamp DESC LIMIT 1000';

  const result = await query(sql, params);
  return result.rows;
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
