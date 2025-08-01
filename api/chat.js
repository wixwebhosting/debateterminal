// api/chat.js - Step by step build up

export default async function handler(req, res) {
    console.log('API called:', req.method);
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Debug GET request
    if (req.method === 'GET') {
        return res.status(200).json({ 
            success: true, 
            message: 'API is working!',
            timestamp: new Date().toISOString()
        });
    }
    
    // Handle POST
    if (req.method === 'POST') {
        try {
            const { prompt, aiModel } = req.body;
            
            if (!prompt) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Prompt is required' 
                });
            }

            // Simple test response first
            return res.json({ 
                success: true, 
                response: `Test response for ${aiModel || 'unknown'}: ${prompt}`,
                aiModel: aiModel || 'TEST'
            });
            
        } catch (error) {
            console.error('Error:', error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }
    
    return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
    });
}
