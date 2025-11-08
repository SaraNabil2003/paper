-- Behavioral Tracking Schema Extension
-- Add this to extend the PSF database for research-grade behavioral monitoring

-- Behavioral Events Table (Copy-Paste, Tab Switching, Focus Loss)
CREATE TABLE IF NOT EXISTS behavioral_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('copy', 'paste', 'tab_switch', 'focus_loss', 'focus_gain', 'window_blur', 'window_focus')),
  event_data JSONB, -- Stores additional context (e.g., pasted content length, target tab)
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_time_elapsed INTEGER DEFAULT 0 -- seconds since session started
);

-- Plagiarism Detection Table
CREATE TABLE IF NOT EXISTS plagiarism_checks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  attempt_id INTEGER REFERENCES attempts(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
  submitted_code TEXT NOT NULL,
  similarity_score DECIMAL(5,4) DEFAULT 0.0, -- 0.0 to 1.0
  matched_sources JSONB, -- Array of sources matched (other students, AI responses, online code)
  detection_type VARCHAR(50) CHECK (detection_type IN ('student_similarity', 'ai_response_similarity', 'online_source')),
  flagged BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Code Execution Events Table (For keystroke pattern analysis)
CREATE TABLE IF NOT EXISTS code_execution_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('code_change', 'run_code', 'submit_code', 'delete_code')),
  code_snapshot TEXT,
  lines_changed INTEGER DEFAULT 0,
  characters_added INTEGER DEFAULT 0,
  characters_deleted INTEGER DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_time_elapsed INTEGER DEFAULT 0
);

-- Research Consent Table (IRB Compliance)
CREATE TABLE IF NOT EXISTS research_consent (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  consent_date TIMESTAMP,
  consent_version VARCHAR(50) DEFAULT '1.0',
  can_use_for_research BOOLEAN DEFAULT FALSE,
  can_share_anonymized BOOLEAN DEFAULT FALSE,
  withdrawal_date TIMESTAMP,
  ip_address VARCHAR(50),
  consent_text TEXT -- Full IRB-approved consent text shown to user
);

-- Session Activity Summary (Aggregated behavioral metrics per session)
CREATE TABLE IF NOT EXISTS session_activity_summary (
  id SERIAL PRIMARY KEY,
  session_id INTEGER UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,

  -- Copy-paste metrics
  total_paste_events INTEGER DEFAULT 0,
  total_copy_events INTEGER DEFAULT 0,
  paste_content_length INTEGER DEFAULT 0,

  -- Focus/attention metrics
  total_tab_switches INTEGER DEFAULT 0,
  total_focus_losses INTEGER DEFAULT 0,
  total_focus_time INTEGER DEFAULT 0, -- seconds with window focused
  total_blur_time INTEGER DEFAULT 0, -- seconds with window blurred

  -- Code activity metrics
  total_code_changes INTEGER DEFAULT 0,
  total_characters_typed INTEGER DEFAULT 0,
  total_characters_deleted INTEGER DEFAULT 0,
  average_typing_speed DECIMAL(6,2) DEFAULT 0.0, -- characters per minute

  -- Plagiarism flags
  plagiarism_flagged BOOLEAN DEFAULT FALSE,
  max_similarity_score DECIMAL(5,4) DEFAULT 0.0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for behavioral tracking performance
CREATE INDEX IF NOT EXISTS idx_behavioral_events_user ON behavioral_events(user_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_session ON behavioral_events(session_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_type ON behavioral_events(event_type);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_timestamp ON behavioral_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_plagiarism_user ON plagiarism_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_attempt ON plagiarism_checks(attempt_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_flagged ON plagiarism_checks(flagged);

CREATE INDEX IF NOT EXISTS idx_code_events_user ON code_execution_events(user_id);
CREATE INDEX IF NOT EXISTS idx_code_events_session ON code_execution_events(session_id);

CREATE INDEX IF NOT EXISTS idx_consent_user ON research_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_research ON research_consent(can_use_for_research);

CREATE INDEX IF NOT EXISTS idx_session_summary_session ON session_activity_summary(session_id);
CREATE INDEX IF NOT EXISTS idx_session_summary_user ON session_activity_summary(user_id);

-- Trigger to update session_activity_summary.updated_at
CREATE OR REPLACE FUNCTION update_session_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_session_summary_timestamp
BEFORE UPDATE ON session_activity_summary
FOR EACH ROW EXECUTE FUNCTION update_session_summary_updated_at();

-- View for research-ready analytics (only consented users)
CREATE OR REPLACE VIEW research_analytics AS
SELECT
  u.id as user_id,
  u.name,
  u.adi,
  u.current_mode,
  u.performance_with_ai,
  u.performance_without_ai,
  s.id as session_id,
  s.problem_id,
  p.title as problem_title,
  p.difficulty,
  sas.total_paste_events,
  sas.total_tab_switches,
  sas.total_focus_losses,
  sas.total_blur_time,
  sas.plagiarism_flagged,
  sas.max_similarity_score,
  sas.average_typing_speed,
  rc.consent_given,
  rc.can_use_for_research
FROM users u
JOIN research_consent rc ON u.id = rc.user_id
JOIN sessions s ON u.id = s.user_id
JOIN problems p ON s.problem_id = p.id
LEFT JOIN session_activity_summary sas ON s.id = sas.session_id
WHERE rc.can_use_for_research = TRUE AND rc.withdrawal_date IS NULL;

-- Function to record behavioral event
CREATE OR REPLACE FUNCTION record_behavioral_event(
  p_user_id INTEGER,
  p_session_id INTEGER,
  p_problem_id INTEGER,
  p_event_type VARCHAR(50),
  p_event_data JSONB DEFAULT NULL,
  p_session_time_elapsed INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
  event_id INTEGER;
BEGIN
  INSERT INTO behavioral_events (user_id, session_id, problem_id, event_type, event_data, session_time_elapsed)
  VALUES (p_user_id, p_session_id, p_problem_id, p_event_type, p_event_data, p_session_time_elapsed)
  RETURNING id INTO event_id;

  -- Update session activity summary
  INSERT INTO session_activity_summary (session_id, user_id, problem_id)
  VALUES (p_session_id, p_user_id, p_problem_id)
  ON CONFLICT (session_id) DO NOTHING;

  -- Update counters based on event type
  IF p_event_type = 'paste' THEN
    UPDATE session_activity_summary
    SET total_paste_events = total_paste_events + 1,
        paste_content_length = paste_content_length + COALESCE((p_event_data->>'length')::INTEGER, 0)
    WHERE session_id = p_session_id;
  ELSIF p_event_type = 'copy' THEN
    UPDATE session_activity_summary
    SET total_copy_events = total_copy_events + 1
    WHERE session_id = p_session_id;
  ELSIF p_event_type = 'tab_switch' THEN
    UPDATE session_activity_summary
    SET total_tab_switches = total_tab_switches + 1
    WHERE session_id = p_session_id;
  ELSIF p_event_type = 'focus_loss' OR p_event_type = 'window_blur' THEN
    UPDATE session_activity_summary
    SET total_focus_losses = total_focus_losses + 1
    WHERE session_id = p_session_id;
  END IF;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE behavioral_events IS 'Tracks all behavioral events (copy, paste, tab switches, focus changes) for research analysis';
COMMENT ON TABLE plagiarism_checks IS 'Stores plagiarism detection results comparing student code against various sources';
COMMENT ON TABLE code_execution_events IS 'Tracks code editing patterns and execution events for behavioral analysis';
COMMENT ON TABLE research_consent IS 'Stores IRB-compliant research consent records for each user';
COMMENT ON TABLE session_activity_summary IS 'Aggregated behavioral metrics per problem-solving session for efficient querying';
