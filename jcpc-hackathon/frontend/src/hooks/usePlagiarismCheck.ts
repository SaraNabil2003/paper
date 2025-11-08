/**
 * Plagiarism Check Hook
 * Automatically checks code submissions for plagiarism
 */

import { useState, useCallback } from 'react';

interface PlagiarismMatch {
  type: 'student_similarity' | 'ai_response_similarity';
  similarity: number;
  userId?: number;
  userName?: string;
  attemptId?: number;
}

interface PlagiarismCheckResult {
  flagged: boolean;
  similarityScore: number;
  matches: PlagiarismMatch[];
  checkId?: number;
  error?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function usePlagiarismCheck() {
  const [checking, setChecking] = useState(false);
  const [lastResult, setLastResult] = useState<PlagiarismCheckResult | null>(null);

  const checkPlagiarism = useCallback(async (
    userId: number,
    attemptId: number,
    problemId: number,
    code: string
  ): Promise<PlagiarismCheckResult> => {
    setChecking(true);

    try {
      const response = await fetch(`${API_BASE}/api/behavioral/plagiarism/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          attemptId,
          problemId,
          code
        })
      });

      if (!response.ok) {
        throw new Error(`Plagiarism check failed: ${response.statusText}`);
      }

      const data = await response.json();
      const result: PlagiarismCheckResult = {
        flagged: data.flagged,
        similarityScore: data.similarityScore,
        matches: data.matches || [],
        checkId: data.checkId
      };

      setLastResult(result);
      return result;
    } catch (error) {
      console.error('Plagiarism check error:', error);
      const errorResult: PlagiarismCheckResult = {
        flagged: false,
        similarityScore: 0,
        matches: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setChecking(false);
    }
  }, []);

  const getUserPlagiarismReport = useCallback(async (userId: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/behavioral/plagiarism/user/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch plagiarism report');
      return await response.json();
    } catch (error) {
      console.error('Error fetching plagiarism report:', error);
      return null;
    }
  }, []);

  return {
    checkPlagiarism,
    getUserPlagiarismReport,
    checking,
    lastResult
  };
}
