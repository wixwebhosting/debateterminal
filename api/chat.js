// api/chat.js - Simplified for debugging

export default function handler(req, res) {
    console.log('API handler called!');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Simple test response
    if (req.method === 'GET') {
        return res.status(200).json({ 
            success: true, 
            message: 'API is working!',
            timestamp: new Date().toISOString(),
            env_check: {
                openai: !!process.env.OPENAI_API_KEY,
                xai: !!process.env.XAI_API_KEY,
                claude: !!process.env.CLAUDE_API_KEY,
                deepseek: !!process.env.DEEPSEEK_API_KEY
            }
        });
    }
    
    if (req.method === 'POST') {
        return res.status(200).json({ 
            success: true, 
            message: 'POST received!',
            body: req.body
        });
    }
    
    return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
    });
}
