// PostgreSQL database operations for PSF
const { query, transaction } = require('./db-config');

// User Management
async function getUsers() {
  const result = await query('SELECT * FROM users ORDER BY id');
  return result.rows;
}

async function getUser(id) {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getUserByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function createUser(userData) {
  const { name, email, passwordHash, role, codeforcesRating } = userData;
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role, codeforces_rating)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, email, passwordHash, role || 'student', codeforcesRating || 0]
  );
  return result.rows[0];
}

async function updateUser(id, updates) {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) return null;

  const setClause = fields.map((field, index) =>
    `${field} = $${index + 2}`
  ).join(', ');

  const result = await query(
    `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );

  return result.rows[0] || null;
}

// Problem Management
async function getProblems() {
  const result = await query('SELECT * FROM problems ORDER BY difficulty, id');
  return result.rows;
}

async function getProblem(id) {
  const result = await query('SELECT * FROM problems WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getTransferProblems() {
  const result = await query('SELECT * FROM problems WHERE is_transfer_problem = TRUE');
  return result.rows;
}

// Test Cases
async function getTestCases(problemId) {
  const result = await query(
    'SELECT * FROM test_cases WHERE problem_id = $1 ORDER BY is_sample DESC, id',
    [problemId]
  );
  return result.rows;
}

// Attempt Management
async function recordAttempt(userId, data) {
  return await transaction(async (client) => {
    // Insert attempt
    const attemptResult = await client.query(
      `INSERT INTO attempts (user_id, problem_id, session_id, success, with_ai, mode, time_spent, code_submitted, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        data.problemId,
        data.sessionId || null,
        data.success || false,
        data.withAI || false,
        data.mode || null,
        data.timeSpent || 0,
        data.codeSubmitted || null,
        data.language || 'javascript'
      ]
    );

    // Update performance metrics
    await updatePerformanceMetrics(client, userId);

    // Recalculate and update ADI
    const newADI = await calculateAndUpdateADI(client, userId);

    // Record ADI in history
    const user = await getUserFromClient(client, userId);
    await client.query(
      `INSERT INTO adi_history (user_id, adi_value, performance_with_ai, performance_without_ai,
        consultation_frequency, early_consultation_ratio, transfer_performance)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        newADI,
        user.performance_with_ai,
        user.performance_without_ai,
        user.consultation_frequency,
        user.early_consultation_ratio,
        user.transfer_performance
      ]
    );

    return attemptResult.rows[0];
  });
}

async function getAttempts(userId, limit = 100) {
  const result = await query(
    'SELECT * FROM attempts WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}

// AI Interaction Management
async function recordAIInteraction(userId, interaction) {
  return await transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO ai_interactions (user_id, problem_id, session_id, mode, time_elapsed, query, response)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        interaction.problemId,
        interaction.sessionId || null,
        interaction.mode,
        interaction.timeElapsed || 0,
        interaction.query,
        interaction.response
      ]
    );

    // Update consultation metrics
    await updateConsultationMetrics(client, userId);

    // Recalculate ADI
    await calculateAndUpdateADI(client, userId);

    return result.rows[0];
  });
}

async function getAIInteractions(userId, limit = 50) {
  const result = await query(
    'SELECT * FROM ai_interactions WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}

// Reflection Management
async function recordReflection(userId, reflection) {
  const result = await query(
    `INSERT INTO reflections (user_id, problem_id, session_id, stage, content, quality)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      reflection.problemId,
      reflection.sessionId || null,
      reflection.stage,
      reflection.content,
      reflection.quality || 1
    ]
  );
  return result.rows[0];
}

async function getReflections(userId, limit = 50) {
  const result = await query(
    'SELECT * FROM reflections WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}

// Session Management
async function startSession(userId, problemId) {
  const result = await query(
    `INSERT INTO sessions (user_id, problem_id, start_time, is_active)
     VALUES ($1, $2, CURRENT_TIMESTAMP, TRUE)
     RETURNING *`,
    [userId, problemId]
  );
  return result.rows[0];
}

async function getSession(userId) {
  const result = await query(
    'SELECT * FROM sessions WHERE user_id = $1 AND is_active = TRUE ORDER BY start_time DESC LIMIT 1',
    [userId]
  );
  return result.rows[0] || null;
}

async function updateSession(userId, updates) {
  const session = await getSession(userId);
  if (!session) return null;

  const fields = Object.keys(updates);
  const values = Object.values(updates);

  if (fields.length === 0) return session;

  const setClause = fields.map((field, index) =>
    `${field} = $${index + 2}`
  ).join(', ');

  const result = await query(
    `UPDATE sessions SET ${setClause} WHERE id = $1 RETURNING *`,
    [session.id, ...values]
  );

  return result.rows[0] || null;
}

async function endSession(userId) {
  const result = await query(
    `UPDATE sessions
     SET is_active = FALSE, end_time = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND is_active = TRUE
     RETURNING *`,
    [userId]
  );
  return result.rows[0] || null;
}

// ADI History
async function getADIHistory(userId, days = 30) {
  const result = await query(
    `SELECT * FROM adi_history
     WHERE user_id = $1 AND recorded_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
     ORDER BY recorded_at ASC`,
    [userId]
  );
  return result.rows;
}

// Mode Progression
async function checkModeProgression(userId) {
  const user = await getUser(userId);
  if (!user) return null;

  const currentMode = user.current_mode;
  let shouldProgress = false;
  let newMode = currentMode;

  // Get recent attempts and reflections
  const attempts = await getAttempts(userId, 50);
  const reflections = await getReflections(userId, 50);

  // Mode 1 -> Mode 2 progression
  if (currentMode === 1) {
    const recentProblems = attempts
      .filter(a => a.with_ai && a.mode === 1)
      .slice(0, 5);

    const solvedInTime = recentProblems.filter(a =>
      a.success && a.time_spent < 30 * 60
    ).length;

    const recentADI = user.adi;
    const recentReflections = reflections
      .slice(0, 5)
      .filter(r => r.quality >= 2);

    if (solvedInTime >= 5 && recentADI < 4.0 && recentReflections.length >= 3) {
      shouldProgress = true;
      newMode = 2;
    }
  }

  // Mode 2 -> Mode 3 progression
  if (currentMode === 2) {
    const recentProblems = attempts
      .filter(a => a.with_ai && a.mode === 2)
      .slice(0, 10);

    const solvedInTime = recentProblems.filter(a =>
      a.success && a.time_spent < 20 * 60
    ).length;

    const aiRestrictedProblems = attempts
      .filter(a => !a.with_ai)
      .slice(0, 10);

    const aiRestrictedSuccess = aiRestrictedProblems.filter(a => a.success).length;
    const aiRestrictedRate = aiRestrictedProblems.length > 0
      ? aiRestrictedSuccess / aiRestrictedProblems.length
      : 0;

    if (solvedInTime >= 10 && user.adi < 3.0 && aiRestrictedRate >= 0.70) {
      shouldProgress = true;
      newMode = 3;
    }
  }

  if (shouldProgress && newMode !== currentMode) {
    await query(
      `UPDATE users SET current_mode = $1 WHERE id = $2`,
      [newMode, userId]
    );

    await query(
      `INSERT INTO mode_history (user_id, from_mode, to_mode, reason)
       VALUES ($1, $2, $3, $4)`,
      [userId, currentMode, newMode, 'automatic_progression']
    );
  }

  return { shouldProgress, newMode, currentMode };
}

// Dashboard Data
async function getDashboardData() {
  const students = await query(
    'SELECT * FROM users WHERE role = $1 ORDER BY adi DESC',
    ['student']
  );

  const totalStudents = students.rows.length;
  const averageADI = totalStudents > 0
    ? students.rows.reduce((acc, s) => acc + parseFloat(s.adi), 0) / totalStudents
    : 0;

  const flaggedStudents = students.rows.filter(s => parseFloat(s.adi) > 7.0);

  const modeDistribution = {
    mode1: students.rows.filter(s => s.current_mode === 1).length,
    mode2: students.rows.filter(s => s.current_mode === 2).length,
    mode3: students.rows.filter(s => s.current_mode === 3).length
  };

  return {
    students: students.rows,
    averageADI: Math.round(averageADI * 10) / 10,
    flaggedStudents,
    totalStudents,
    modeDistribution
  };
}

// Helper Functions
async function getUserFromClient(client, userId) {
  const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0];
}

async function updatePerformanceMetrics(client, userId) {
  const attemptsResult = await client.query(
    'SELECT * FROM attempts WHERE user_id = $1',
    [userId]
  );
  const attempts = attemptsResult.rows;

  const withAIAttempts = attempts.filter(a => a.with_ai);
  const withoutAIAttempts = attempts.filter(a => !a.with_ai);

  let performanceWithAI = 0;
  let performanceWithoutAI = 0;
  let transferPerformance = 0;

  if (withAIAttempts.length > 0) {
    const successCount = withAIAttempts.filter(a => a.success).length;
    performanceWithAI = successCount / withAIAttempts.length;
  }

  if (withoutAIAttempts.length > 0) {
    const successCount = withoutAIAttempts.filter(a => a.success).length;
    performanceWithoutAI = successCount / withoutAIAttempts.length;

    // Transfer performance: recent success without AI
    const recentWithoutAI = withoutAIAttempts.slice(-10);
    const recentSuccess = recentWithoutAI.filter(a => a.success).length;
    transferPerformance = recentSuccess / recentWithoutAI.length;
  }

  await client.query(
    `UPDATE users
     SET performance_with_ai = $1,
         performance_without_ai = $2,
         transfer_performance = $3
     WHERE id = $4`,
    [performanceWithAI, performanceWithoutAI, transferPerformance, userId]
  );
}

async function updateConsultationMetrics(client, userId) {
  const interactionsResult = await client.query(
    'SELECT * FROM ai_interactions WHERE user_id = $1',
    [userId]
  );
  const interactions = interactionsResult.rows;

  const attemptsResult = await client.query(
    'SELECT * FROM attempts WHERE user_id = $1',
    [userId]
  );
  const attempts = attemptsResult.rows;

  if (interactions.length === 0) return;

  // Consultation frequency
  const problemsWithAI = new Set(interactions.map(i => i.problem_id)).size;
  const totalProblems = new Set(attempts.map(a => a.problem_id)).size;
  const consultationFrequency = totalProblems > 0
    ? Math.min(1, problemsWithAI / totalProblems)
    : 0;

  // Early consultation ratio
  const earlyConsultations = interactions.filter(i =>
    i.time_elapsed < 10 * 60
  ).length;
  const earlyConsultationRatio = interactions.length > 0
    ? earlyConsultations / interactions.length
    : 0;

  await client.query(
    `UPDATE users
     SET consultation_frequency = $1,
         early_consultation_ratio = $2
     WHERE id = $3`,
    [consultationFrequency, earlyConsultationRatio, userId]
  );
}

async function calculateAndUpdateADI(client, userId) {
  const user = await getUserFromClient(client, userId);

  // ADI Formula from paper
  const w1 = 0.35;
  const w2 = 0.25;
  const w3 = 0.25;
  const w4 = 0.15;

  const performanceGap = user.performance_with_ai - user.performance_without_ai;
  const consultationFreq = user.consultation_frequency || 0;
  const earlyRatio = user.early_consultation_ratio || 0;
  const transferPerf = user.transfer_performance || 0;

  const adi = (w1 * performanceGap * 10) +
              (w2 * consultationFreq * 10) +
              (w3 * earlyRatio * 10) -
              (w4 * transferPerf * 10);

  const clampedADI = Math.max(0, Math.min(10, adi));

  await client.query(
    'UPDATE users SET adi = $1 WHERE id = $2',
    [clampedADI, userId]
  );

  return clampedADI;
}

module.exports = {
  // Users
  getUsers,
  getUser,
  getUserByEmail,
  createUser,
  updateUser,

  // Problems
  getProblems,
  getProblem,
  getTransferProblems,
  getTestCases,

  // Attempts
  recordAttempt,
  getAttempts,

  // AI Interactions
  recordAIInteraction,
  getAIInteractions,

  // Reflections
  recordReflection,
  getReflections,

  // Sessions
  startSession,
  getSession,
  updateSession,
  endSession,

  // ADI & Analytics
  getADIHistory,
  checkModeProgression,
  getDashboardData
};
