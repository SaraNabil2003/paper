# Research Platform Analysis Report
## Progressive Scaffolding Framework (PSF) - Current State Assessment

**Analysis Date:** November 8, 2025  
**Platform:** JCPC Hackathon Research Platform  
**Focus:** Tracking AI usage, plagiarism, and student behavior for research

---

## EXECUTIVE SUMMARY

The Progressive Scaffolding Framework is a **well-architected, production-ready platform** for tracking AI-assisted competitive programming education. It successfully implements sophisticated AI dependency tracking through the ADI (AI Dependency Index) metric, but **lacks granular behavioral monitoring** needed for comprehensive research on student activity patterns, copy-paste events, and tab-switching behavior.

**Current State:** ✅ **Research-Grade for AI Dependency** | ⚠️ **Gaps for Behavioral Analytics**

---

## 1. OPENAI API INTEGRATION

### Status: ✅ FULLY IMPLEMENTED

**Location:** `/home/user/paper/jcpc-hackathon/backend/server-enhanced.js` (Lines 40-127)

#### Features Implemented:
1. **OpenAI GPT-4 Integration**
   - Full API endpoint: `https://api.openai.com/v1/chat/completions`
   - Configurable via `OPENAI_API_KEY` environment variable
   - Fallback responses when API unavailable (for demo mode)

2. **Three Distinct Assistance Modes with System Prompts:**
   - **Mode 1 (Hint-Based, Maximum Support):** Socratic questions, problem decomposition guidance, NO code
   - **Mode 2 (Conceptual, Moderate Support):** Pseudocode allowed, complexity analysis, conceptual walkthroughs
   - **Mode 3 (Minimal, Low Support):** Verification-only, bug identification without fixes

3. **API Call Mechanism** (server-enhanced.js:87-127)
   ```javascript
   - Method: POST to OpenAI API
   - Model: gpt-4
   - Temperature: 0.3 (deterministic)
   - Max tokens: 500
   - Headers: Bearer token authentication
   ```

4. **Protocol Enforcement:**
   - Struggle-first protocol: 15 min (Easy), 30 min (Medium+)
   - Submission requirement: ≥1 attempt before AI access
   - ADI-based restriction: ADI > 7.5 blocks access
   - Each request logged with timestamp and mode

#### Data Collected per AI Request:
```json
{
  "studentId": number,
  "problemId": number,
  "sessionId": number,
  "mode": 1|2|3,
  "timeElapsed": seconds,
  "query": "user question",
  "response": "AI response",
  "timestamp": UNIX timestamp
}
```

**Database Table:** `ai_interactions` (9 fields including query/response)

---

## 2. ANALYTICS & TRACKING CURRENTLY IMPLEMENTED

### Status: ✅ PARTIALLY IMPLEMENTED (AI-focused, behavior-limited)

### A. AI Dependency Index (ADI) - ✅ Comprehensive

**Formula:** `ADI = 0.35×(SuccessAI - SuccessNoAI) + 0.25×ConsultationFreq + 0.25×EarlyConsultationRatio - 0.15×TransferPerf`

**Components Tracked:**
1. ✅ **Performance Gap:** Success rate with AI vs without AI
2. ✅ **Consultation Frequency:** How often students request AI help
3. ✅ **Early Consultation Ratio:** Requests before 10 minutes (eagerness to use AI)
4. ✅ **Transfer Performance:** Success on novel problems without AI

**ADI Zones:**
- Healthy (<2.5)
- Moderate (2.5-5.0)
- High (5.0-7.5)
- Critical (>7.5)

**Tracking Points:** (database.js:237-256, db-postgres.js:453-481)
- Recorded after each attempt
- Real-time calculation
- Historical tracking (30-day ADI history with `adi_history` table)
- WebSocket notifications on ADI changes

### B. Session Tracking - ✅ Implemented

**Per-Session Data Collected:**
```
- sessionId, userId, problemId
- startTime, endTime
- aiRequested (boolean)
- aiAccessGranted (boolean)
- submissionAttempts (count)
- struggleTime (seconds)
- pauseStatus
```

**Tracked Events:**
- Session start (app.tsx:138-223)
- Submission attempts recorded (app.tsx:225-241)
- Time spent on problem (real-time timer)
- AI requests made (app.tsx:243-279)

### C. Problem Attempts - ✅ Tracked

**Data Per Attempt:**
```
- attemptId, userId, problemId, sessionId
- success (boolean)
- withAI (boolean)
- mode (1|2|3)
- timeSpent (seconds)
- codeSubmitted (text)
- language (javascript|python|c++|java)
- timestamp
```

### D. Reflections - ✅ Tracked

**Three Stages Monitored:**
1. Pre-solving (problem understanding)
2. During (approach selection)
3. Post-solving (solution evaluation)

**Metrics:**
- Content text stored
- Quality score (1-4 based on length/depth)
- Stage and timestamp

### E. Mode Progression - ✅ Tracked

**Automatic Mode Advancement:**
- Triggered after each attempt
- Criteria-based (problems solved, ADI thresholds, reflection quality)
- Mode history logged with timestamps and reasons

---

## 3. PLAGIARISM DETECTION FEATURES

### Status: ❌ NOT IMPLEMENTED

**Missing:**
- No code similarity analysis
- No copy-paste detection
- No code comparison across students
- No semantic similarity checking
- No submission deduplication

**What IS Tracked:**
- ✅ Code submissions are stored in `attempts` table
- ✅ Student can see their own submission history
- ✅ Coach can see code was submitted
- ❌ But NO plagiarism analysis tools

**Recommendation:** Would require:
1. Third-party plagiarism API (e.g., MOSS, JPlag)
2. Client-side event capture for copy-paste actions
3. Code fingerprinting/hashing system

---

## 4. BEHAVIORAL TRACKING - CURRENTLY IMPLEMENTED

### A. Copy-Paste Events - ❌ NOT TRACKED

**Current Status:**
- No client-side event listeners for copy/paste
- No clipboard event monitoring
- No tracking of copied code origin (external vs internal)

**What Would Be Needed:**
```javascript
// Not in current codebase:
document.addEventListener('copy', (event) => {
  // Track what was copied and when
});

document.addEventListener('paste', (event) => {
  // Track what was pasted and source
});
```

### B. Tab Switching / Focus Loss - ❌ NOT TRACKED

**Current Status:**
- No page visibility API usage
- No tab/window focus change detection
- No monitoring of document blur/focus events

**What Would Be Needed:**
```javascript
// Not in current codebase:
document.addEventListener('visibilitychange', () => {
  // Track when student switches tabs
});

window.addEventListener('blur', () => {
  // Track when window loses focus
});

window.addEventListener('focus', () => {
  // Track when window regains focus
});
```

### C. Keyboard Activity - ⚠️ PARTIAL

**Tracked:**
- ✅ Code changes in editor are recorded
- ✅ Text length contributes to reflection quality scoring

**Not Tracked:**
- ❌ Keystroke frequency/velocity
- ❌ Pause duration between keystrokes
- ❌ Copy/paste vs original typing
- ❌ Code edit patterns

### D. Mouse Activity - ❌ NOT TRACKED

**Not Monitored:**
- ❌ Mouse movement patterns
- ❌ Click frequency
- ❌ Scroll behavior
- ❌ Time between interactions

### E. Code Editor Interactions - ✅ PARTIAL

**Tracked:**
- ✅ Code submissions
- ✅ Code execution attempts
- ✅ Test runs

**Not Tracked:**
- ❌ Cursor position changes
- ❌ Selection actions
- ❌ Undo/redo operations
- ❌ Editor resize events
- ❌ Line edits vs block edits

---

## 5. DATA COLLECTION & STORAGE

### Database Schema - ✅ Comprehensive

**Tables Implemented:**

| Table | Fields | Purpose | Status |
|-------|--------|---------|--------|
| `users` | 10+ | Students, coaches, mode, ADI | ✅ Full |
| `problems` | 8 | Problem definitions, metadata | ✅ Full |
| `test_cases` | 6 | Input/output pairs | ✅ Full |
| `sessions` | 10 | Problem-solving sessions | ✅ Full |
| `attempts` | 11 | Problem solve attempts | ✅ Full |
| `ai_interactions` | 8 | AI requests/responses | ✅ Full |
| `reflections` | 7 | Student reflections | ✅ Full |
| `mode_history` | 5 | Mode progression | ✅ Full |
| `adi_history` | 7 | ADI trend tracking | ✅ Full |

**Storage Options:**
- ✅ In-memory (development)
- ✅ PostgreSQL (production)

**Sample Data Available:**
- 4 sample students with varied ADI values
- 20 competitive programming problems
- 5 transfer problems (AI-restricted assessment)
- 25+ test cases

---

## 6. FRONTEND & BACKEND ARCHITECTURE

### Frontend Stack - ✅ Modern React

**Location:** `/home/user/paper/jcpc-hackathon/frontend/src/`

**Main Components:**
1. **App.tsx** (1,030 lines)
   - Student problem-solving interface
   - AI request handling
   - Code editor with test execution
   - Reflection modal system
   - Analytics display

2. **CoachDashboard.tsx** (468 lines)
   - Student monitoring
   - ADI visualization
   - Intervention recommendations
   - Mode distribution chart

3. **ADIHistoryChart.tsx**
   - 30-day ADI trend visualization
   - Interactive metric switching

**Technology:**
- React 18 with TypeScript
- Vite bundler
- Fetch API for HTTP requests
- No WebSocket client (yet)

### Backend Stack - ✅ Production-Ready

**Location:** `/home/user/paper/jcpc-hackathon/backend/`

**Core Files:**
1. **server-enhanced.js** (493 lines) - Main Express server
   - 25+ API endpoints
   - OpenAI integration
   - Session management
   - AI request processing

2. **auth.js & auth-routes.js** - JWT Authentication
   - User registration/login
   - Token management
   - Role-based access control

3. **code-executor.js** - Sandboxed Code Execution
   - 4 language support (JavaScript, Python, C++, Java)
   - 5-second timeout
   - 1MB output limit

4. **websocket-server.js** - Real-time Updates
   - User authentication for WS
   - Event broadcasting
   - Connection management

5. **database-facade.js** - Database Abstraction
   - Routes to PostgreSQL or in-memory
   - Unified interface

6. **db-postgres.js** - PostgreSQL Implementation (Full)

**API Endpoints Relevant to Research:**
```
POST   /api/session/start              - Start problem session
POST   /api/session/update             - Record submission
POST   /api/ai/request                 - Request AI (with logging)
POST   /api/attempt                    - Record solve attempt
POST   /api/reflection                 - Submit reflection
GET    /api/analytics/:studentId       - Get ADI & metrics
GET    /api/dashboard                  - Coach overview
```

---

## 7. WHAT'S MISSING FOR RESEARCH-RELIABLE TRACKING

### High Priority - Essential for Academic Research

#### A. Copy-Paste Event Monitoring - ⚠️ CRITICAL

**Impact:** Without this, can't distinguish between original problem-solving vs AI-assisted copying

**Required Implementation:**
```javascript
// Frontend: Add to App.tsx
const trackCopyPaste = () => {
  document.addEventListener('copy', (e) => {
    logEvent('copy', {
      selectedText: e.clipboardData?.getData('text'),
      timestamp: Date.now(),
      source: 'code-editor' | 'external' | 'ai-response'
    });
  });

  document.addEventListener('paste', (e) => {
    logEvent('paste', {
      pastedText: e.clipboardData?.getData('text'),
      timestamp: Date.now(),
      cursorPosition: editor.getCursorPosition()
    });
  });
};

// Backend: Add table
CREATE TABLE clipboard_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  session_id INTEGER REFERENCES sessions(id),
  event_type VARCHAR(20), -- 'copy' | 'paste'
  text_length INTEGER,
  source VARCHAR(50),
  timestamp TIMESTAMP
);
```

#### B. Tab/Window Focus Tracking - ⚠️ CRITICAL

**Impact:** Identifies when students leave the problem-solving window (potential external help seeking)

**Required Implementation:**
```javascript
// Frontend: Add to App.tsx
const trackTabVisibility = () => {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      logEvent('tab_hidden', { timestamp: Date.now() });
    } else {
      logEvent('tab_visible', { timestamp: Date.now() });
    }
  });

  window.addEventListener('blur', () => {
    logEvent('window_blur', { timestamp: Date.now() });
  });

  window.addEventListener('focus', () => {
    logEvent('window_focus', { timestamp: Date.now() });
  });
};

// Backend: Add table
CREATE TABLE window_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  session_id INTEGER REFERENCES sessions(id),
  event_type VARCHAR(20), -- 'blur' | 'focus' | 'tab_hidden' | 'tab_visible'
  duration_ms INTEGER,
  timestamp TIMESTAMP
);
```

#### C. Plagiarism Detection Integration - ⚠️ IMPORTANT

**Options:**
1. **MOSS (Measure of Software Similarity)**
   - Academic-focused
   - Supports multiple languages
   - No API key required

2. **JPlag**
   - Specifically for code
   - Open source

3. **Codequiry**
   - Cloud-based
   - API available

**Implementation Location:** New route at `/api/plagiarism/check`

```javascript
POST /api/plagiarism/check
Body: { submittedCode, problemId, language }
Response: { similarityScore, flaggedStudents, matches[] }
```

#### D. Keystroke Pattern Analysis - ⚠️ RECOMMENDED

**Captures:**
- Typing speed variations
- Pause patterns (suggests thinking vs copy-paste)
- Code structure patterns

**Implementation:**
```javascript
// Track edit events
CREATE TABLE keystroke_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  session_id INTEGER,
  event_type VARCHAR(20), -- 'insert' | 'delete' | 'select'
  text_changed VARCHAR(500),
  cursor_position INTEGER,
  time_since_last_keystroke_ms INTEGER,
  timestamp TIMESTAMP
);
```

#### E. AI Interaction Quality Metrics - ⚠️ RECOMMENDED

**Currently Missing:**
- ❌ How much of AI response was used
- ❌ Did student understand the response
- ❌ Time spent reading AI response
- ❌ Response usefulness rating
- ❌ Code similarity between response and submission

**Could Add:**
```javascript
POST /api/ai/response-evaluation
Body: {
  interactionId: number,
  understood: boolean,
  implemented: boolean,
  usefulnessRating: 1-5,
  timeSpentReading: seconds,
  codeUsed: percentage
}
```

---

## 8. COMPARISON TABLE: Features vs Research Needs

| Feature | Current Status | Research Ready | Notes |
|---------|---|---|---|
| AI Usage Tracking | ✅ Comprehensive | ✅ Yes | Every request logged with query/response |
| Copy-Paste Events | ❌ Missing | ❌ No | Critical gap for plagiarism research |
| Tab Switching | ❌ Missing | ❌ No | Could indicate external help-seeking |
| Keystroke Patterns | ⚠️ Partial | ❌ No | Code changes tracked, but not detailed patterns |
| Mouse Activity | ❌ Missing | ⚠️ Low Priority | Nice-to-have for behavioral analysis |
| Session Duration | ✅ Tracked | ✅ Yes | Accurate time measurements per problem |
| Problem Attempts | ✅ Full | ✅ Yes | All attempts stored with success status |
| Code Submissions | ✅ Stored | ✅ Yes | Full code available in database |
| Reflection Quality | ✅ Tracked | ✅ Yes | Text and quality scores recorded |
| AI Dependency Metrics | ✅ Complete | ✅ Yes | Sophisticated multi-component metric |
| Mode Progression | ✅ Logged | ✅ Yes | Criteria and timing tracked |
| Plagiarism Detection | ❌ Missing | ❌ No | No code similarity analysis |
| Performance Analytics | ✅ Good | ✅ Yes | With/without AI comparisons |
| Intervention Recommendations | ✅ Automated | ✅ Yes | Rule-based for coaches |
| Historical Trends | ✅ 30-day ADI | ✅ Yes | Via `adi_history` table |

---

## 9. RECOMMENDATIONS FOR RESEARCH DEPLOYMENT

### Tier 1: Essential Additions (Required for Publication)
1. ✅ Copy-paste event tracking (frontend + database table)
2. ✅ Tab/window focus monitoring (frontend + database table)
3. ✅ Plagiarism detection integration (API call + results storage)
4. ✅ Research consent & data governance UI

### Tier 2: Enhanced Metrics (Recommended)
1. ✅ Keystroke pattern analysis
2. ✅ AI response utilization measurement
3. ✅ Code similarity scoring (local vs AI response)
4. ✅ Detailed session activity feed

### Tier 3: Advanced Analytics (Nice-to-have)
1. ✅ Machine learning-based anomaly detection
2. ✅ Student skill trajectory modeling
3. ✅ Transfer learning success prediction
4. ✅ Comparative cohort analysis

---

## 10. SECURITY & PRIVACY CONSIDERATIONS

### Current Protections:
✅ JWT authentication  
✅ Password hashing (bcrypt)  
✅ CORS configuration  
✅ Helmet.js security headers  
✅ Environment variable secrets  

### Research-Specific Concerns:
⚠️ **IRB Compliance:** Needs explicit consent flow for data collection  
⚠️ **FERPA Compliance:** Student data must be de-identified for publication  
⚠️ **Data Retention:** Needs deletion policy  
⚠️ **Third-party APIs:** OpenAI sends data to external service (GDPR/CCPA implications)  

---

## 11. DEPLOYMENT STATUS

### Production Ready: ✅ YES (for teaching)
- PostgreSQL support
- Authentication system
- Multi-language code execution
- WebSocket real-time updates
- Rate limiting
- Error handling

### Research Ready: ⚠️ PARTIALLY
- **Strengths:** Excellent AI usage tracking, ADI calculation, session management
- **Weaknesses:** Missing behavioral event tracking, no plagiarism detection, lacks consent UI

### Estimated Effort to Research-Ready:
- Copy-paste tracking: **2-3 hours**
- Tab switching: **1-2 hours**
- Plagiarism integration: **4-6 hours**
- Consent UI: **3-4 hours**
- **Total: ~10-15 hours of development**

---

## 12. CODE FILES SUMMARY

### Frontend (React/TypeScript)
- `/home/user/paper/jcpc-hackathon/frontend/src/App.tsx` - Main UI (1,030 lines)
- `/home/user/paper/jcpc-hackathon/frontend/src/CoachDashboard.tsx` - Instructor view (468 lines)
- `/home/user/paper/jcpc-hackathon/frontend/src/ADIHistoryChart.tsx` - Trend visualization

### Backend (Node.js/Express)
- `/home/user/paper/jcpc-hackathon/backend/server-enhanced.js` - Main server (493 lines)
- `/home/user/paper/jcpc-hackathon/backend/db-postgres.js` - Database operations
- `/home/user/paper/jcpc-hackathon/backend/websocket-server.js` - Real-time updates
- `/home/user/paper/jcpc-hackathon/backend/code-executor.js` - Code execution sandbox

### Database
- `/home/user/paper/jcpc-hackathon/backend/schema.sql` - PostgreSQL schema (9 tables)

### Configuration
- `/home/user/paper/jcpc-hackathon/backend/.env.example` - Environment variables

---

## CONCLUSION

The Progressive Scaffolding Framework is **production-ready for educational use** with **excellent AI dependency tracking** through its sophisticated ADI metric system. However, it requires **moderate enhancements** to become fully research-reliable for publishing academic papers on student behavior and plagiarism patterns.

**Key Strengths:**
- ✅ Comprehensive AI usage logging
- ✅ Real-time dependency metrics
- ✅ Multi-modal AI assistance system
- ✅ Production-grade infrastructure
- ✅ Coach intervention tools

**Critical Gaps for Research:**
- ❌ No behavioral event tracking (copy/paste, tab switching)
- ❌ No plagiarism detection
- ❌ No research consent framework
- ❌ Limited student activity pattern analysis

**Recommendation:** Add the Tier 1 features listed in Section 9, then the platform becomes publication-ready.

