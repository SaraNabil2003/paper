-- Progressive Scaffolding Framework Database Schema
-- PostgreSQL version

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS ai_interactions CASCADE;
DROP TABLE IF EXISTS reflections CASCADE;
DROP TABLE IF EXISTS attempts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS mode_history CASCADE;
DROP TABLE IF EXISTS adi_history CASCADE;
DROP TABLE IF EXISTS test_cases CASCADE;
DROP TABLE IF EXISTS problems CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (combines students and coaches)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'student', -- 'student' or 'coach'
  codeforces_rating INTEGER DEFAULT 0,
  current_mode INTEGER DEFAULT 1 CHECK (current_mode IN (1, 2, 3)),
  adi DECIMAL(5,2) DEFAULT 0.0,
  performance_with_ai DECIMAL(5,4) DEFAULT 0.0,
  performance_without_ai DECIMAL(5,4) DEFAULT 0.0,
  consultation_frequency DECIMAL(5,4) DEFAULT 0.0,
  early_consultation_ratio DECIMAL(5,4) DEFAULT 0.0,
  transfer_performance DECIMAL(5,4) DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problems table
CREATE TABLE problems (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(50) NOT NULL,
  codeforces_rating INTEGER DEFAULT 0,
  category VARCHAR(100),
  tags TEXT[], -- Array of tags
  is_transfer_problem BOOLEAN DEFAULT FALSE, -- For transfer assessment
  time_limit INTEGER DEFAULT 2000, -- milliseconds
  memory_limit INTEGER DEFAULT 256, -- MB
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test cases table
CREATE TABLE test_cases (
  id SERIAL PRIMARY KEY,
  problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample BOOLEAN DEFAULT FALSE,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ADI history table (for tracking trends)
CREATE TABLE adi_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  adi_value DECIMAL(5,2) NOT NULL,
  performance_with_ai DECIMAL(5,4),
  performance_without_ai DECIMAL(5,4),
  consultation_frequency DECIMAL(5,4),
  early_consultation_ratio DECIMAL(5,4),
  transfer_performance DECIMAL(5,4),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mode history table
CREATE TABLE mode_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  from_mode INTEGER CHECK (from_mode IN (1, 2, 3)),
  to_mode INTEGER CHECK (to_mode IN (1, 2, 3)),
  reason VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (problem-solving sessions)
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  ai_requested BOOLEAN DEFAULT FALSE,
  ai_access_granted BOOLEAN DEFAULT FALSE,
  submission_attempts INTEGER DEFAULT 0,
  struggle_time INTEGER DEFAULT 0, -- seconds
  paused BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attempts table (problem solving attempts)
CREATE TABLE attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  success BOOLEAN DEFAULT FALSE,
  with_ai BOOLEAN DEFAULT FALSE,
  mode INTEGER CHECK (mode IN (1, 2, 3) OR mode IS NULL),
  time_spent INTEGER DEFAULT 0, -- seconds
  code_submitted TEXT,
  language VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI interactions table
CREATE TABLE ai_interactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  mode INTEGER NOT NULL CHECK (mode IN (1, 2, 3)),
  time_elapsed INTEGER DEFAULT 0, -- seconds since session start
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reflections table
CREATE TABLE reflections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  stage VARCHAR(50) NOT NULL CHECK (stage IN ('pre-solving', 'during', 'post-solving')),
  content TEXT NOT NULL,
  quality INTEGER DEFAULT 1 CHECK (quality >= 1 AND quality <= 4),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_attempts_user ON attempts(user_id);
CREATE INDEX idx_attempts_problem ON attempts(problem_id);
CREATE INDEX idx_attempts_timestamp ON attempts(timestamp);
CREATE INDEX idx_ai_interactions_user ON ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_timestamp ON ai_interactions(timestamp);
CREATE INDEX idx_reflections_user ON reflections(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_active ON sessions(is_active);
CREATE INDEX idx_adi_history_user ON adi_history(user_id);
CREATE INDEX idx_adi_history_timestamp ON adi_history(recorded_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data insertion

-- Insert default coach
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Dr. Robert Smith', 'coach@university.edu', '$2b$10$dummy.hash.for.development.only', 'coach');

-- Insert sample students
INSERT INTO users (
  name, email, password_hash, role, codeforces_rating, current_mode,
  adi, performance_with_ai, performance_without_ai,
  consultation_frequency, early_consultation_ratio, transfer_performance
) VALUES
  ('Sarah Chen', 'sarah@university.edu', '$2b$10$dummy.hash.for.development.only', 'student', 1350, 2, 3.2, 0.85, 0.72, 0.3, 0.15, 0.68),
  ('Ahmed Hassan', 'ahmed@university.edu', '$2b$10$dummy.hash.for.development.only', 'student', 1100, 1, 6.8, 0.90, 0.25, 0.85, 0.70, 0.20),
  ('Maria Garcia', 'maria@university.edu', '$2b$10$dummy.hash.for.development.only', 'student', 1500, 3, 1.8, 0.75, 0.70, 0.15, 0.05, 0.80),
  ('Li Wei', 'liwei@university.edu', '$2b$10$dummy.hash.for.development.only', 'student', 1250, 2, 4.5, 0.82, 0.60, 0.45, 0.25, 0.55);

-- Insert sample problems
INSERT INTO problems (title, description, difficulty, codeforces_rating, category, tags, is_transfer_problem) VALUES
  ('Two Sum',
   'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
   'Easy', 800, 'Arrays', ARRAY['hash-table', 'array'], FALSE),

  ('Binary Search',
   'Given a sorted array of integers, implement binary search to find the target element. Return the index if found, otherwise return -1.',
   'Medium', 1200, 'Search', ARRAY['binary-search', 'divide-and-conquer'], FALSE),

  ('Longest Substring Without Repeating Characters',
   'Given a string s, find the length of the longest substring without repeating characters.',
   'Medium', 1400, 'Strings', ARRAY['hash-table', 'sliding-window', 'string'], FALSE),

  ('Valid Parentheses',
   'Given a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.',
   'Easy', 900, 'Stack', ARRAY['stack', 'string'], FALSE),

  ('Merge Two Sorted Lists',
   'You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a one sorted list.',
   'Easy', 1000, 'Linked List', ARRAY['linked-list', 'recursion'], FALSE),

  ('Maximum Subarray',
   'Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.',
   'Medium', 1300, 'Dynamic Programming', ARRAY['array', 'divide-and-conquer', 'dynamic-programming'], FALSE),

  ('Climbing Stairs',
   'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
   'Easy', 800, 'Dynamic Programming', ARRAY['math', 'dynamic-programming'], FALSE),

  ('Best Time to Buy and Sell Stock',
   'You are given an array prices where prices[i] is the price of a given stock on the ith day. Maximize your profit by choosing a single day to buy and a different day to sell.',
   'Easy', 900, 'Arrays', ARRAY['array', 'dynamic-programming'], FALSE),

  ('Contains Duplicate',
   'Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.',
   'Easy', 700, 'Arrays', ARRAY['array', 'hash-table'], FALSE),

  ('Reverse Linked List',
   'Given the head of a singly linked list, reverse the list, and return the reversed list.',
   'Easy', 900, 'Linked List', ARRAY['linked-list', 'recursion'], FALSE),

  ('Implement Queue using Stacks',
   'Implement a first in first out (FIFO) queue using only two stacks.',
   'Easy', 1000, 'Stack', ARRAY['stack', 'design', 'queue'], FALSE),

  ('Coin Change',
   'You are given an integer array coins representing coins of different denominations and an integer amount. Return the fewest number of coins needed to make up that amount.',
   'Medium', 1500, 'Dynamic Programming', ARRAY['array', 'dynamic-programming'], FALSE),

  ('Lowest Common Ancestor',
   'Given a binary search tree (BST), find the lowest common ancestor (LCA) of two given nodes in the BST.',
   'Medium', 1400, 'Trees', ARRAY['tree', 'binary-search-tree'], FALSE),

  ('Course Schedule',
   'There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites. Return true if you can finish all courses.',
   'Medium', 1600, 'Graphs', ARRAY['depth-first-search', 'breadth-first-search', 'graph', 'topological-sort'], FALSE),

  ('3Sum',
   'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.',
   'Medium', 1500, 'Arrays', ARRAY['array', 'two-pointers'], FALSE),

  -- Transfer problems (AI-restricted for assessment)
  ('Product of Array Except Self',
   'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].',
   'Medium', 1400, 'Arrays', ARRAY['array', 'prefix-sum'], TRUE),

  ('Rotate Array',
   'Given an array, rotate the array to the right by k steps, where k is non-negative.',
   'Medium', 1200, 'Arrays', ARRAY['array', 'math', 'two-pointers'], TRUE),

  ('Single Number',
   'Given a non-empty array of integers nums, every element appears twice except for one. Find that single one.',
   'Easy', 800, 'Bit Manipulation', ARRAY['array', 'bit-manipulation'], TRUE),

  ('Missing Number',
   'Given an array nums containing n distinct numbers in the range [0, n], return the only number in the range that is missing from the array.',
   'Easy', 700, 'Arrays', ARRAY['array', 'math', 'bit-manipulation'], TRUE),

  ('Majority Element',
   'Given an array nums of size n, return the majority element (appears more than ⌊n / 2⌋ times).',
   'Easy', 900, 'Arrays', ARRAY['array', 'divide-and-conquer'], TRUE);

-- Insert sample test cases for Two Sum
INSERT INTO test_cases (problem_id, input, expected_output, is_sample, explanation) VALUES
  (1, '[2,7,11,15]\n9', '[0,1]', TRUE, 'Because nums[0] + nums[1] == 9'),
  (1, '[3,2,4]\n6', '[1,2]', TRUE, 'Because nums[1] + nums[2] == 6'),
  (1, '[3,3]\n6', '[0,1]', FALSE, 'Both elements are the same value');

-- Insert sample test cases for Binary Search
INSERT INTO test_cases (problem_id, input, expected_output, is_sample, explanation) VALUES
  (2, '[-1,0,3,5,9,12]\n9', '4', TRUE, 'Element 9 is at index 4'),
  (2, '[-1,0,3,5,9,12]\n2', '-1', TRUE, 'Element 2 does not exist'),
  (2, '[5]\n5', '0', FALSE, 'Single element array');

-- Initialize ADI history for sample students
INSERT INTO adi_history (user_id, adi_value, performance_with_ai, performance_without_ai, consultation_frequency, early_consultation_ratio, transfer_performance)
SELECT id, adi, performance_with_ai, performance_without_ai, consultation_frequency, early_consultation_ratio, transfer_performance
FROM users WHERE role = 'student';
