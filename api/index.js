const express = require('express');
const path = require('path');
const cors = require('cors');
const { getAIResponse, AI_MODELS, handleUserMessageResponse, runDebateLoop } = require('./chat.js');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

// Store active debate sessions (in memory for serverless)
const debateSessions = new Map();

// Helper function to generate session ID
function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// API Routes
app.get('/api/questions/:category', (req, res) => {
  try {
    const { category } = req.params;
    const questions = debateQuestions[category];
    
    if (!questions) {
      return res.status(404).json({ 
        success: false, 
        error: 'Category not found' 
      });
    }
    
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    res.json({ 
      success: true, 
      question: randomQuestion 
    });
  } catch (error) {
    console.error('Error getting question:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get question' 
    });
  }
});

app.post('/api/debate/start', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt is required' 
      });
    }
    
    const sessionId = generateSessionId();
    const session = {
      id: sessionId,
      prompt: prompt.trim(),
      messages: [],
      currentTurn: 0,
      isActive: false,
      createdAt: new Date(),
      aiModels: [...AI_MODELS] // Copy the array
    };
    
    debateSessions.set(sessionId, session);
    
    res.json({ 
      success: true, 
      sessionId: sessionId,
      message: 'Debate session created successfully' 
    });
  } catch (error) {
    console.error('Error starting debate:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start debate session' 
    });
  }
});

app.post('/api/debate/:sessionId/start', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = debateSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
    }
    
    session.isActive = true;
    
    // Start the debate loop asynchronously
    setImmediate(() => {
      runDebateLoop(sessionId, debateSessions);
    });
    
    res.json({ 
      success: true, 
      message: 'Debate started successfully' 
    });
  } catch (error) {
    console.error('Error starting debate loop:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start debate loop' 
    });
  }
});

app.get('/api/debate/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = debateSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
    }
    
    res.json({ 
      success: true, 
      session: {
        id: session.id,
        prompt: session.prompt,
        messages: session.messages,
        currentTurn: session.currentTurn,
        isActive: session.isActive,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get session' 
    });
  }
});

app.post('/api/debate/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;
    const session = debateSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
    }
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message content is required' 
      });
    }
    
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      speaker: 'USER',
      content: content.trim(),
      timestamp: new Date(),
      turn: session.currentTurn
    };
    
    session.messages.push(userMessage);
    
    // Handle user intervention in debate
    if (session.isActive) {
      setImmediate(() => {
        handleUserMessageResponse(sessionId, content.trim(), debateSessions);
      });
    }
    
    res.json({ 
      success: true, 
      message: 'User message added successfully' 
    });
  } catch (error) {
    console.error('Error adding user message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add user message' 
    });
  }
});

app.post('/api/debate/stop/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = debateSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
    }
    
    session.isActive = false;
    
    res.json({ 
      success: true, 
      message: 'Debate stopped successfully' 
    });
  } catch (error) {
    console.error('Error stopping debate:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to stop debate' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    sessions: debateSessions.size
  });
});

module.exports = app;
