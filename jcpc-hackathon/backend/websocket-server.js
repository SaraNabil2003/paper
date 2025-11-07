// WebSocket server for real-time updates
const WebSocket = require('ws');
const auth = require('./auth');

let wss = null;
const clients = new Map(); // userId -> Set of WebSocket connections

// Initialize WebSocket server
function initializeWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    console.log('WebSocket connection attempt');

    // Extract token from query string or headers
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || req.headers['sec-websocket-protocol'];

    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    // Verify token
    const payload = auth.verifyToken(token);
    if (!payload) {
      ws.close(1008, 'Invalid token');
      return;
    }

    // Store connection
    const userId = payload.userId;
    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId).add(ws);

    console.log(`WebSocket authenticated: User ${userId} (${payload.role})`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      userId,
      role: payload.role,
      timestamp: Date.now()
    }));

    // Handle messages from client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleClientMessage(ws, userId, payload.role, data);
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format'
        }));
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log(`WebSocket disconnected: User ${userId}`);
      const userConnections = clients.get(userId);
      if (userConnections) {
        userConnections.delete(ws);
        if (userConnections.size === 0) {
          clients.delete(userId);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log('✅ WebSocket server initialized on /ws');
  return wss;
}

// Handle messages from clients
function handleClientMessage(ws, userId, userRole, data) {
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    case 'subscribe':
      // Subscribe to specific events (for coaches)
      if (userRole === 'coach') {
        ws.subscriptions = data.events || [];
        ws.send(JSON.stringify({
          type: 'subscribed',
          events: ws.subscriptions
        }));
      }
      break;

    default:
      console.log('Unknown message type:', data.type);
  }
}

// Broadcast event to specific user
function sendToUser(userId, event) {
  const connections = clients.get(userId);
  if (!connections) return;

  const message = JSON.stringify(event);
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Broadcast event to all coaches
function broadcastToCoaches(event) {
  const message = JSON.stringify(event);

  clients.forEach((connections, userId) => {
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        // Send to coaches only (check if subscribed to this event type)
        if (!ws.subscriptions || ws.subscriptions.includes(event.type)) {
          ws.send(message);
        }
      }
    });
  });
}

// Broadcast event to all connected clients
function broadcast(event) {
  const message = JSON.stringify(event);

  clients.forEach(connections => {
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  });
}

// Event emitters for various actions

function notifyAttemptRecorded(userId, attempt) {
  // Notify the student
  sendToUser(userId, {
    type: 'attempt_recorded',
    attempt,
    timestamp: Date.now()
  });

  // Notify coaches
  broadcastToCoaches({
    type: 'student_attempt',
    userId,
    attempt,
    timestamp: Date.now()
  });
}

function notifyADIUpdated(userId, adi, adiZone) {
  sendToUser(userId, {
    type: 'adi_updated',
    adi,
    adiZone,
    timestamp: Date.now()
  });

  // Notify coaches if student enters high/critical zone
  if (adi > 5.0) {
    broadcastToCoaches({
      type: 'adi_alert',
      userId,
      adi,
      adiZone,
      timestamp: Date.now()
    });
  }
}

function notifyModeProgression(userId, progression) {
  sendToUser(userId, {
    type: 'mode_progression',
    progression,
    timestamp: Date.now()
  });

  broadcastToCoaches({
    type: 'student_progressed',
    userId,
    progression,
    timestamp: Date.now()
  });
}

function notifyAIInteraction(userId, interaction) {
  sendToUser(userId, {
    type: 'ai_response',
    interaction,
    timestamp: Date.now()
  });

  broadcastToCoaches({
    type: 'student_ai_interaction',
    userId,
    interaction,
    timestamp: Date.now()
  });
}

function notifySessionStarted(userId, session) {
  sendToUser(userId, {
    type: 'session_started',
    session,
    timestamp: Date.now()
  });

  broadcastToCoaches({
    type: 'student_session_started',
    userId,
    session,
    timestamp: Date.now()
  });
}

function notifyReflectionSubmitted(userId, reflection) {
  sendToUser(userId, {
    type: 'reflection_submitted',
    reflection,
    timestamp: Date.now()
  });

  broadcastToCoaches({
    type: 'student_reflection',
    userId,
    reflection,
    timestamp: Date.now()
  });
}

// Get connection stats
function getStats() {
  return {
    totalConnections: Array.from(clients.values()).reduce((sum, set) => sum + set.size, 0),
    uniqueUsers: clients.size,
    users: Array.from(clients.keys())
  };
}

module.exports = {
  initializeWebSocket,
  sendToUser,
  broadcastToCoaches,
  broadcast,
  notifyAttemptRecorded,
  notifyADIUpdated,
  notifyModeProgression,
  notifyAIInteraction,
  notifySessionStarted,
  notifyReflectionSubmitted,
  getStats
};
