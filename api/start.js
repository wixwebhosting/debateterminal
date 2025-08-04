// Simple in-memory storage for serverless
let debateSessions = new Map();

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
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

    res.status(200).json({
      success: true,
      sessionId,
      message: 'Debate session created successfully'
    });
  } catch (error) {
    console.error('Error in /api/start:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
};
