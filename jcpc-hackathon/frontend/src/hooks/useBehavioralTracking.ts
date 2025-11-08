/**
 * Behavioral Tracking Hook
 * Tracks copy-paste events, tab switching, and window focus for research purposes
 */

import { useEffect, useRef, useCallback } from 'react';

interface BehavioralEvent {
  userId: number;
  sessionId: number;
  problemId: number;
  eventType: 'copy' | 'paste' | 'tab_switch' | 'focus_loss' | 'focus_gain' | 'window_blur' | 'window_focus';
  metadata?: Record<string, any>;
  sessionTimeElapsed: number;
}

interface BehavioralTrackingOptions {
  userId: number;
  sessionId: number | null;
  problemId: number | null;
  enabled?: boolean;
  batchSize?: number; // Number of events to batch before sending
  batchInterval?: number; // ms to wait before sending batch
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useBehavioralTracking(options: BehavioralTrackingOptions) {
  const {
    userId,
    sessionId,
    problemId,
    enabled = true,
    batchSize = 10,
    batchInterval = 5000
  } = options;

  const eventQueue = useRef<BehavioralEvent[]>([]);
  const sessionStartTime = useRef<number>(Date.now());
  const lastFocusTime = useRef<number>(Date.now());
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate time elapsed since session start
  const getTimeElapsed = useCallback(() => {
    return Math.floor((Date.now() - sessionStartTime.current) / 1000);
  }, []);

  // Send events to backend
  const sendEvents = useCallback(async () => {
    if (eventQueue.current.length === 0) return;

    const eventsToSend = [...eventQueue.current];
    eventQueue.current = [];

    try {
      await fetch(`${API_BASE}/api/behavioral/events/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend })
      });
      console.log(`[Behavioral Tracking] Sent ${eventsToSend.length} events`);
    } catch (error) {
      console.error('[Behavioral Tracking] Failed to send events:', error);
      // Re-queue events on failure
      eventQueue.current = [...eventsToSend, ...eventQueue.current];
    }
  }, []);

  // Queue an event (with batching)
  const queueEvent = useCallback((
    eventType: BehavioralEvent['eventType'],
    metadata?: Record<string, any>
  ) => {
    if (!enabled || !sessionId || !problemId) return;

    const event: BehavioralEvent = {
      userId,
      sessionId,
      problemId,
      eventType,
      metadata,
      sessionTimeElapsed: getTimeElapsed()
    };

    eventQueue.current.push(event);
    console.log(`[Behavioral Tracking] Queued: ${eventType}`, metadata);

    // Send immediately if batch size reached
    if (eventQueue.current.length >= batchSize) {
      sendEvents();
      // Clear any pending timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
    } else {
      // Schedule batch send if not already scheduled
      if (!batchTimeoutRef.current) {
        batchTimeoutRef.current = setTimeout(() => {
          sendEvents();
          batchTimeoutRef.current = null;
        }, batchInterval);
      }
    }
  }, [enabled, sessionId, problemId, userId, getTimeElapsed, batchSize, batchInterval, sendEvents]);

  // Track copy events
  useEffect(() => {
    if (!enabled) return;

    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection()?.toString() || '';
      queueEvent('copy', {
        length: selection.length,
        hasContent: selection.length > 0
      });
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [enabled, queueEvent]);

  // Track paste events
  useEffect(() => {
    if (!enabled) return;

    const handlePaste = (e: ClipboardEvent) => {
      const pastedText = e.clipboardData?.getData('text') || '';
      queueEvent('paste', {
        length: pastedText.length,
        hasContent: pastedText.length > 0,
        // Store first 100 chars for analysis (privacy-conscious)
        preview: pastedText.substring(0, 100)
      });
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [enabled, queueEvent]);

  // Track tab visibility changes (user switching tabs)
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        queueEvent('tab_switch', {
          focusTime: Date.now() - lastFocusTime.current,
          hidden: true
        });
      } else {
        queueEvent('tab_switch', {
          hidden: false,
          awayTime: Date.now() - lastFocusTime.current
        });
        lastFocusTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, queueEvent]);

  // Track window focus/blur
  useEffect(() => {
    if (!enabled) return;

    const handleBlur = () => {
      queueEvent('window_blur', {
        focusTime: Date.now() - lastFocusTime.current
      });
    };

    const handleFocus = () => {
      const awayTime = Date.now() - lastFocusTime.current;
      queueEvent('window_focus', {
        awayTime
      });
      lastFocusTime.current = Date.now();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, queueEvent]);

  // Track page focus loss (using Page Visibility API)
  useEffect(() => {
    if (!enabled) return;

    const handleFocusLoss = () => {
      if (!document.hasFocus()) {
        queueEvent('focus_loss', {
          timestamp: Date.now()
        });
      }
    };

    const handleFocusGain = () => {
      if (document.hasFocus()) {
        queueEvent('focus_gain', {
          timestamp: Date.now()
        });
      }
    };

    // Check focus periodically (every 2 seconds)
    const focusCheckInterval = setInterval(() => {
      if (document.hidden || !document.hasFocus()) {
        handleFocusLoss();
      }
    }, 2000);

    window.addEventListener('focus', handleFocusGain);

    return () => {
      clearInterval(focusCheckInterval);
      window.removeEventListener('focus', handleFocusGain);
    };
  }, [enabled, queueEvent]);

  // Send any remaining events when unmounting or session changes
  useEffect(() => {
    return () => {
      if (eventQueue.current.length > 0) {
        sendEvents();
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [sendEvents]);

  // Reset session start time when session changes
  useEffect(() => {
    if (sessionId) {
      sessionStartTime.current = Date.now();
      lastFocusTime.current = Date.now();
    }
  }, [sessionId]);

  return {
    // Expose manual event tracking if needed
    trackEvent: queueEvent,
    flushEvents: sendEvents
  };
}
