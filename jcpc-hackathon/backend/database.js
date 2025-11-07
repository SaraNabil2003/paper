// Progressive Scaffolding Framework Database
let database = {
  students: [
    { 
      id: 1, 
      name: "Sarah Chen", 
      email: "sarah@university.edu",
      codeforcesRating: 1350,
      currentMode: 2, // 1=Hint, 2=Conceptual, 3=Minimal
      adi: 3.2,
      performanceWithAI: 0.85,
      performanceWithoutAI: 0.72,
      consultationFrequency: 0.3, // normalized [0,1]
      earlyConsultationRatio: 0.15, // % consultations < 10min
      transferPerformance: 0.68, // success on novel problems without AI
      attempts: [],
      aiInteractions: [],
      reflections: [],
      modeHistory: [],
      sessions: []
    },
    { 
      id: 2, 
      name: "Ahmed Hassan", 
      email: "ahmed@university.edu",
      codeforcesRating: 1100,
      currentMode: 1,
      adi: 6.8,
      performanceWithAI: 0.90,
      performanceWithoutAI: 0.25,
      consultationFrequency: 0.85,
      earlyConsultationRatio: 0.70,
      transferPerformance: 0.20,
      attempts: [],
      aiInteractions: [],
      reflections: [],
      modeHistory: [],
      sessions: []
    }
  ],
  problems: [
    {
      id: 1,
      title: "Two Sum",
      description: "Find two numbers that add up to a target value.",
      difficulty: "Easy",
      codeforcesRating: 800,
      testCases: []
    },
    {
      id: 2,
      title: "Binary Search",
      description: "Implement binary search on a sorted array.",
      difficulty: "Medium",
      codeforcesRating: 1200,
      testCases: []
    }
  ],
  currentSessions: {} // studentId -> session
};

module.exports = {
  getStudents: () => database.students,
  getStudent: (id) => database.students.find(s => s.id === id),
  getProblems: () => database.problems,
  getProblem: (id) => database.problems.find(p => p.id === id),
  
  recordAttempt: (studentId, data) => {
    const student = database.students.find(s => s.id === studentId);
    if (!student) return null;
    
    const attempt = {
      ...data,
      timestamp: Date.now(),
      problemId: data.problemId,
      success: data.success || false,
      withAI: data.withAI || false,
      timeSpent: data.timeSpent || 0
    };
    
    student.attempts.push(attempt);
    
    // Update performance metrics
    updatePerformanceMetrics(student);
    
    // Recalculate ADI
    student.adi = calculateADI(student);
    
    return student;
  },
  
  recordAIInteraction: (studentId, interaction) => {
    const student = database.students.find(s => s.id === studentId);
    if (!student) return null;
    
    const aiInteraction = {
      ...interaction,
      timestamp: Date.now(),
      mode: interaction.mode || student.currentMode,
      timeElapsed: interaction.timeElapsed || 0,
      problemId: interaction.problemId
    };
    
    student.aiInteractions.push(aiInteraction);
    
    // Update consultation metrics
    updateConsultationMetrics(student);
    
    // Recalculate ADI
    student.adi = calculateADI(student);
    
    return aiInteraction;
  },
  
  recordReflection: (studentId, reflection) => {
    const student = database.students.find(s => s.id === studentId);
    if (!student) return null;
    
    const reflectionData = {
      ...reflection,
      timestamp: Date.now(),
      problemId: reflection.problemId,
      stage: reflection.stage, // 'pre-solving', 'during', 'post-solving'
      quality: reflection.quality || 1 // 1-4 scale
    };
    
    student.reflections.push(reflectionData);
    return reflectionData;
  },
  
  startSession: (studentId, problemId) => {
    const session = {
      studentId,
      problemId,
      startTime: Date.now(),
      aiRequested: false,
      aiAccessGranted: false,
      submissionAttempts: 0,
      struggleTime: 0,
      paused: false
    };
    
    database.currentSessions[studentId] = session;
    
    const student = database.students.find(s => s.id === studentId);
    if (student) {
      student.sessions.push({
        ...session,
        endTime: null
      });
    }
    
    return session;
  },
  
  getSession: (studentId) => {
    return database.currentSessions[studentId] || null;
  },
  
  updateSession: (studentId, updates) => {
    const session = database.currentSessions[studentId];
    if (session) {
      Object.assign(session, updates);
    }
    return session;
  },
  
  checkModeProgression: (studentId) => {
    const student = database.students.find(s => s.id === studentId);
    if (!student) return null;
    
    const currentMode = student.currentMode;
    let shouldProgress = false;
    let newMode = currentMode;
    
    // Mode 1 -> Mode 2 progression
    if (currentMode === 1) {
      const recentProblems = student.attempts
        .filter(a => a.withAI && a.mode === 1)
        .slice(-5);
      
      const solvedInTime = recentProblems.filter(a => 
        a.success && a.timeSpent < 30 * 60
      ).length;
      
      const recentADI = student.adi;
      const recentReflections = student.reflections
        .slice(-5)
        .filter(r => r.quality >= 2);
      
      if (solvedInTime >= 5 && recentADI < 4.0 && recentReflections.length >= 3) {
        shouldProgress = true;
        newMode = 2;
      }
    }
    
    // Mode 2 -> Mode 3 progression
    if (currentMode === 2) {
      const recentProblems = student.attempts
        .filter(a => a.withAI && a.mode === 2)
        .slice(-10);
      
      const solvedInTime = recentProblems.filter(a => 
        a.success && a.timeSpent < 20 * 60
      ).length;
      
      const aiRestrictedProblems = student.attempts
        .filter(a => !a.withAI)
        .slice(-10);
      
      const aiRestrictedSuccess = aiRestrictedProblems.filter(a => a.success).length;
      const aiRestrictedRate = aiRestrictedProblems.length > 0 
        ? aiRestrictedSuccess / aiRestrictedProblems.length 
        : 0;
      
      if (solvedInTime >= 10 && student.adi < 3.0 && aiRestrictedRate >= 0.70) {
        shouldProgress = true;
        newMode = 3;
      }
    }
    
    if (shouldProgress && newMode !== currentMode) {
      student.currentMode = newMode;
      student.modeHistory.push({
        fromMode: currentMode,
        toMode: newMode,
        timestamp: Date.now(),
        reason: 'automatic_progression'
      });
    }
    
    return { shouldProgress, newMode, currentMode };
  }
};

// Helper functions
function calculateADI(student) {
  // ADI Formula from paper:
  // ADI = w1·(SuccessAI − SuccessNoAI) + w2·ConsultationFreq + w3·EarlyRatio − w4·TransferPerf
  const w1 = 0.35;
  const w2 = 0.25;
  const w3 = 0.25;
  const w4 = 0.15;
  
  const performanceGap = student.performanceWithAI - student.performanceWithoutAI;
  const consultationFreq = student.consultationFrequency || 0;
  const earlyRatio = student.earlyConsultationRatio || 0;
  const transferPerf = student.transferPerformance || 0;
  
  const adi = (w1 * performanceGap * 10) + 
              (w2 * consultationFreq * 10) + 
              (w3 * earlyRatio * 10) - 
              (w4 * transferPerf * 10);
  
  return Math.max(0, Math.min(10, adi)); // Clamp to [0, 10]
}

function updatePerformanceMetrics(student) {
  const withAIAttempts = student.attempts.filter(a => a.withAI);
  const withoutAIAttempts = student.attempts.filter(a => !a.withAI);
  
  if (withAIAttempts.length > 0) {
    const successCount = withAIAttempts.filter(a => a.success).length;
    student.performanceWithAI = successCount / withAIAttempts.length;
  }
  
  if (withoutAIAttempts.length > 0) {
    const successCount = withoutAIAttempts.filter(a => a.success).length;
    student.performanceWithoutAI = successCount / withoutAIAttempts.length;
  }
  
  // Transfer performance: success on novel problems without AI
  const recentWithoutAI = withoutAIAttempts.slice(-10);
  if (recentWithoutAI.length > 0) {
    const successCount = recentWithoutAI.filter(a => a.success).length;
    student.transferPerformance = successCount / recentWithoutAI.length;
  }
}

function updateConsultationMetrics(student) {
  const interactions = student.aiInteractions;
  if (interactions.length === 0) return;
  
  // Consultation frequency: normalized queries per problem
  const problemsWithAI = new Set(interactions.map(i => i.problemId)).size;
  const totalProblems = new Set(student.attempts.map(a => a.problemId)).size;
  student.consultationFrequency = totalProblems > 0 
    ? Math.min(1, problemsWithAI / totalProblems) 
    : 0;
  
  // Early consultation ratio: % consultations < 10 minutes
  const earlyConsultations = interactions.filter(i => 
    i.timeElapsed < 10 * 60
  ).length;
  student.earlyConsultationRatio = interactions.length > 0
    ? earlyConsultations / interactions.length
    : 0;
}