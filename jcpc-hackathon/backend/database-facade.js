// Database Facade - Routes to PostgreSQL or in-memory based on configuration
const dbConfig = require('./db-config');
let usePostgres = false;
let dbPostgres = null;
let dbMemory = null;

// Initialize database (call this on server startup)
async function initializeDatabase() {
  const pool = await dbConfig.initializeDatabase();
  usePostgres = pool !== null;

  if (usePostgres) {
    dbPostgres = require('./db-postgres');
    console.log('✅ Using PostgreSQL database');
  } else {
    dbMemory = require('./database');
    console.log('✅ Using in-memory database');
  }

  return usePostgres;
}

// Facade functions - route to appropriate implementation
function getStudents() {
  return usePostgres ? dbPostgres.getUsers() : Promise.resolve(dbMemory.getStudents());
}

function getStudent(id) {
  return usePostgres ? dbPostgres.getUser(id) : Promise.resolve(dbMemory.getStudent(id));
}

function getProblems() {
  return usePostgres ? dbPostgres.getProblems() : Promise.resolve(dbMemory.getProblems());
}

function getProblem(id) {
  return usePostgres ? dbPostgres.getProblem(id) : Promise.resolve(dbMemory.getProblem(id));
}

function recordAttempt(studentId, data) {
  return usePostgres
    ? dbPostgres.recordAttempt(studentId, data)
    : Promise.resolve(dbMemory.recordAttempt(studentId, data));
}

function recordAIInteraction(studentId, interaction) {
  return usePostgres
    ? dbPostgres.recordAIInteraction(studentId, interaction)
    : Promise.resolve(dbMemory.recordAIInteraction(studentId, interaction));
}

function recordReflection(studentId, reflection) {
  return usePostgres
    ? dbPostgres.recordReflection(studentId, reflection)
    : Promise.resolve(dbMemory.recordReflection(studentId, reflection));
}

function startSession(studentId, problemId) {
  return usePostgres
    ? dbPostgres.startSession(studentId, problemId)
    : Promise.resolve(dbMemory.startSession(studentId, problemId));
}

function getSession(studentId) {
  return usePostgres
    ? dbPostgres.getSession(studentId)
    : Promise.resolve(dbMemory.getSession(studentId));
}

function updateSession(studentId, updates) {
  return usePostgres
    ? dbPostgres.updateSession(studentId, updates)
    : Promise.resolve(dbMemory.updateSession(studentId, updates));
}

function checkModeProgression(studentId) {
  return usePostgres
    ? dbPostgres.checkModeProgression(studentId)
    : Promise.resolve(dbMemory.checkModeProgression(studentId));
}

// PostgreSQL-only features (return null for in-memory mode)
function getUserByEmail(email) {
  return usePostgres ? dbPostgres.getUserByEmail(email) : Promise.resolve(null);
}

function createUser(userData) {
  return usePostgres ? dbPostgres.createUser(userData) : Promise.resolve(null);
}

function getTestCases(problemId) {
  return usePostgres ? dbPostgres.getTestCases(problemId) : Promise.resolve([]);
}

function getADIHistory(userId, days = 30) {
  return usePostgres ? dbPostgres.getADIHistory(userId, days) : Promise.resolve([]);
}

function getDashboardData() {
  if (usePostgres) {
    return dbPostgres.getDashboardData();
  } else {
    const students = dbMemory.getStudents();
    const averageADI = students.length > 0
      ? students.reduce((acc, s) => acc + s.adi, 0) / students.length
      : 0;

    const flaggedStudents = students.filter(s => s.adi > 7.0);

    return Promise.resolve({
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
  }
}

function getAttempts(userId, limit = 100) {
  return usePostgres ? dbPostgres.getAttempts(userId, limit) : Promise.resolve([]);
}

function getReflections(userId, limit = 50) {
  return usePostgres ? dbPostgres.getReflections(userId, limit) : Promise.resolve([]);
}

function endSession(userId) {
  return usePostgres ? dbPostgres.endSession(userId) : Promise.resolve(null);
}

module.exports = {
  initializeDatabase,
  isUsingPostgres: () => usePostgres,

  // Core functions
  getStudents,
  getStudent,
  getProblems,
  getProblem,
  recordAttempt,
  recordAIInteraction,
  recordReflection,
  startSession,
  getSession,
  updateSession,
  checkModeProgression,

  // Extended functions
  getUserByEmail,
  createUser,
  getTestCases,
  getADIHistory,
  getDashboardData,
  getAttempts,
  getReflections,
  endSession
};
