const express = require('express');
const path = require('path');
const cors = require('cors');
const { getAIResponse, AI_MODELS, handleUserMessageResponse, runDebateLoop } = require('./api/chat');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Debate questions for each category
const debateQuestions = {
  philosophy: [
    "Should we prioritize individual freedom or collective well-being in society?",
    "Is consciousness just an emergent property of complex information processing?",
    "Can moral truths exist independently of human opinion?",
    "Is the meaning of life something we discover or create?",
    "Should we embrace or resist technological augmentation of human capabilities?"
  ],
  technology: [
    "Will artificial intelligence ultimately benefit or threaten humanity?",
    "Should there be limits on genetic engineering and human enhancement?",
    "Is privacy a fundamental right in the digital age?",
    "Will automation create more jobs than it destroys?",
    "Should tech companies be regulated like public utilities?"
  ],
  science: [
    "Is the multiverse theory scientifically valid or just speculation?",
    "Should we prioritize space exploration or fixing Earth's problems?",
    "Is consciousness reducible to purely physical processes?",
    "Can we achieve sustainable energy without nuclear power?",
    "Should human cloning be permitted for medical purposes?"
  ],
  politics: [
    "Is democracy the best form of government for all societies?",
    "Should wealth inequality be addressed through redistribution?",
    "Can capitalism and environmental sustainability coexist?",
    "Is globalization beneficial or harmful to developing nations?",
    "Should voting be mandatory in democratic societies?"
  ]
};

// Store active debate sessions
const debateSessions = new Map();

// API Routes
app.get('/api/questions/:category', (req, res) => {
  const { category } = req.params;
  if (debateQuestions[category]) {
    const questions = debateQuestions[category];
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    res.json({ success: true, question: randomQuestion });
  } else {
    res.status(400).json({ success: false, error: 'Invalid category' });
  }
});

app.post('/api/debate/start', (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
  const session = {
    id: sessionId,
    prompt: prompt.trim(),
    messages: [],
    currentTurn: 0,
    isActive: false,
    createdAt: new Date()
  };

  debateSessions.set(sessionId, session);

  res.json({
    success: true,
    sessionId,
    message: 'Debate session created successfully'
  });
});

app.post('/api/debate/stop/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (debateSessions.has(sessionId)) {
    const session = debateSessions.get(sessionId);
    session.isActive = false;
    res.json({ success: true, message: 'Debate stopped' });
  } else {
    res.status(404).json({ success: false, error: 'Session not found' });
  }
});

// Get debate session status and messages
app.get('/api/debate/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (debateSessions.has(sessionId)) {
    const session = debateSessions.get(sessionId);
    
    console.log(`📡 [API POLL] Session ${sessionId} polled. Messages in session: ${session.messages.length}`);
    session.messages.forEach((msg, index) => {
      console.log(`  ${index}: ${msg.speaker} - "${msg.content.substring(0, 30)}..." (isTyping: ${msg.isTyping})`);
    });
    
    res.json({
      success: true,
      session: {
        id: session.id,
        prompt: session.prompt,
        messages: session.messages,
        isActive: session.isActive,
        currentTurn: session.currentTurn
      }
    });
  } else {
    res.status(404).json({ success: false, error: 'Session not found' });
  }
});

// Start the debate
app.post('/api/debate/:sessionId/start', async (req, res) => {
  const { sessionId } = req.params;
  
  if (!debateSessions.has(sessionId)) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  const session = debateSessions.get(sessionId);
  session.isActive = true;
  
  console.log(`Starting debate for session: ${sessionId}`);
  
  // Start the debate loop in background using chat.js function
  runDebateLoop(sessionId, debateSessions);
  
  res.json({ success: true, message: 'Debate started' });
});

// Add user message to debate
app.post('/api/debate/:sessionId/message', async (req, res) => {
  const { sessionId } = req.params;
  const { content } = req.body;
  
  if (!debateSessions.has(sessionId)) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  const session = debateSessions.get(sessionId);
  
  const message = {
    id: Date.now().toString(),
    speaker: 'USER',
    content: content,
    timestamp: new Date(),
    turn: session.messages.length
  };
  
  session.messages.push(message);
  
  console.log(`👤 [USER MESSAGE] Session ${sessionId}: "${content}"`);
  
  // If debate is active, trigger an AI response to the user message
  if (session.isActive) {
    console.log(`🤖 [TRIGGERING AI RESPONSE] to user message`);
    
    // Use the chat.js function to handle the AI response
    setTimeout(async () => {
      await handleUserMessageResponse(session, debateSessions);
    }, 2000);
  }
  
  res.json({ success: true, message: 'Message added' });
});

// Cleanup old sessions (run every hour)
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [sessionId, session] of debateSessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      debateSessions.delete(sessionId);
      console.log(`Cleaned up old session: ${sessionId}`);
    }
  }
}, 60 * 60 * 1000);

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Debate Terminal server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
});
