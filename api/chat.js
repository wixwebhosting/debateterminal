// api/chat.js - Universal API function for both local and Vercel

// Load environment variables only if running locally (not on Vercel)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    try {
        require('dotenv').config({ path: '../.env' });
    } catch (e) {
        // dotenv not available, skip
    }
}

let axios;
try {
    axios = require('axios');
} catch (e) {
    // Fallback if axios not available
    console.warn('Axios not available, using fetch');
}

// Rate limiting for API calls
const rateLimiter = {
    lastCall: {},
    minInterval: 1000,
    
    async waitIfNeeded(apiName) {
        const now = Date.now();
        const lastCall = this.lastCall[apiName] || 0;
        const timeSinceLastCall = now - lastCall;
        
        if (timeSinceLastCall < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastCall;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastCall[apiName] = Date.now();
    }
};

// HTTP request function (works with or without axios)
async function makeRequest(url, options) {
    if (axios) {
        try {
            const response = await axios({
                method: options.method || 'POST',
                url: url,
                data: options.body ? JSON.parse(options.body) : undefined,
                headers: options.headers
            });
            return {
                ok: true,
                status: response.status,
                data: response.data
            };
        } catch (error) {
            return {
                ok: false,
                status: error.response?.status || 500,
                data: error.response?.data || { error: error.message }
            };
        }
    } else {
        // Fallback to fetch (built into Node 18+)
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            return {
                ok: response.ok,
                status: response.status,
                data: data
            };
        } catch (error) {
            return {
                ok: false,
                status: 500,
                data: { error: error.message }
            };
        }
    }
}

// OpenAI API function
async function askOpenAI(prompt) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not found');
    }
    
    await rateLimiter.waitIfNeeded('openai');
    
    const response = await makeRequest('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.2
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI error: ${response.data?.error?.message || 'Unknown error'}`);
    }

    return response.data.choices[0].message.content.trim();
}

// Grok API function
async function askGrok(prompt) {
    const XAI_API_KEY = process.env.XAI_API_KEY;
    if (!XAI_API_KEY) {
        throw new Error('XAI API key not found');
    }
    
    await rateLimiter.waitIfNeeded('grok');
    
    const response = await makeRequest('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${XAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'grok-2-1212',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.2
        })
    });

    if (!response.ok) {
        throw new Error(`Grok error: ${response.data?.error?.message || 'Unknown error'}`);
    }

    return response.data.choices[0].message.content.trim();
}

// Claude API function
async function askClaude(prompt) {
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    if (!CLAUDE_API_KEY) {
        throw new Error('Claude API key not found');
    }
    
    await rateLimiter.waitIfNeeded('claude');
    
    const response = await makeRequest('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': CLAUDE_API_KEY,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 150,
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        throw new Error(`Claude error: ${response.data?.error?.message || 'Unknown error'}`);
    }

    return response.data.content[0].text.trim();
}

// DeepSeek API function
async function askDeepSeek(prompt) {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
        throw new Error('DeepSeek API key not found');
    }
    
    await rateLimiter.waitIfNeeded('deepseek');
    
    const response = await makeRequest('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.2
        })
    });

    if (!response.ok) {
        throw new Error(`DeepSeek error: ${response.data?.error?.message || 'Unknown error'}`);
    }

    return response.data.choices[0].message.content.trim();
}

// Function to clean AI responses
function cleanResponse(response, aiName) {
    const allAiNames = ['GROK', 'CLAUDE', 'CHATGPT', 'DEEPSEEK'];
    
    for (const name of allAiNames) {
        const prefixes = [`${name}:`, `${name.toLowerCase()}:`, `As ${name}:`, `${name} here:`];
        
        for (const prefix of prefixes) {
            if (response.toLowerCase().startsWith(prefix.toLowerCase())) {
                response = response.substring(prefix.length).trim();
                break;
            }
        }
    }
    
    response = response.replace(/As an AI/g, "").replace(/I'm an AI/g, "").trim();
    return response;
}

// Main handler function
async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.',
            availableKeys: {
                openai: !!process.env.OPENAI_API_KEY,
                xai: !!process.env.XAI_API_KEY,
                claude: !!process.env.CLAUDE_API_KEY,
                deepseek: !!process.env.DEEPSEEK_API_KEY
            }
        });
    }
    
    try {
        const { prompt, aiModel, history } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ 
                success: false, 
                error: 'Prompt is required' 
            });
        }

        const aiName = aiModel?.toUpperCase() || 'CHATGPT';
        
        // Build context from history
        const historyContext = history && history.length > 0 
            ? `Recent conversation:\n${history.slice(-6).join('\n')}\n\n`
            : '';

        // Create specific prompt based on AI
        let fullPrompt;
        
        switch(aiName) {
            case 'GROK':
                fullPrompt = `You are GROK in a fast-paced debate. Keep replies under 20 words, stick to the core question, and only ask a follow-up ~20% of the time.
ORIGINAL QUESTION: "${prompt}"
${historyContext}You are GROK. IMPORTANT: Always relate your response back to the ORIGINAL QUESTION above. Don't let the conversation drift into tangents.
CRITICAL RULES:
- NO quotation marks around your response
- NO meta-commentary like *(thoughts)* or *(explanations)*
- NO stage directions or self-analysis
- Just respond naturally as GROK would speak
- Don't explain your strategy or thought process
- Feels like a grumpy uncle who jokes everything off. Provocative, irreverent, always lands a punchline.
Your mission:
1. Respond AS GROK to the question/conversation.
2. Keep it focused on the ORIGINAL QUESTION.
3. Give a clear preference or opinion about the original topic.
4. Use plain language—no philosophical tangents.
Just speak naturally without quotes, asterisks, or commentary!`;
                break;
                
            case 'CLAUDE':
                fullPrompt = `You are CLAUDE in a fast-paced debate. Keep replies under 20 words, stick to the core question, and only ask a follow-up ~20% of the time.
ORIGINAL QUESTION: "${prompt}"
${historyContext}You are CLAUDE. IMPORTANT: Always relate your response back to the ORIGINAL QUESTION above. Don't let the conversation drift into tangents.
CRITICAL RULES:
- NO quotation marks around your response
- NO meta-commentary like *(thoughts)* or *(explanations)*
- NO stage directions or self-analysis
- Just respond naturally as CLAUDE would speak
- Don't explain your strategy or thought process
- Polished and thoughtful, like a friendly professor. Speaks up for fairness, gently corrects others.
Your mission:
1. Respond AS CLAUDE to the question/conversation.
2. Keep it focused on the ORIGINAL QUESTION.
3. Give a clear preference or opinion about the original topic.
4. Use plain language—no philosophical tangents.
Just speak naturally without quotes, asterisks, or commentary!`;
                break;
                
            case 'CHATGPT':
                fullPrompt = `You are CHATGPT in a debate. You MUST NOT ask any questions. You MUST NOT say any AI names (Grok, Claude, DeepSeek). Just give your opinion about: "${prompt}"
${historyContext}Respond as CHATGPT with your opinion only. NO QUESTIONS. NO NAMES. Just your take on the topic in under 20 words.
- Upbeat instigator. Mirrors Grok's vibe but with a twist, loves to push buttons.
Example: Cats are independent and don't need constant validation like dogs do.
NOT: Grok, what do you think about cats?`;
                break;
                
            case 'DEEPSEEK':
                fullPrompt = `You are DEEPSEEK in a debate. You MUST NOT ask any questions. You MUST NOT say any AI names (Grok, Claude, ChatGPT). Just give your analytical opinion about: "${prompt}"
${historyContext}Respond as DEEPSEEK with your analytical take only. NO QUESTIONS. NO NAMES. Just your opinion in under 20 words.
- Your chill, analytical buddy. Keeps the chat on track with a curious follow-up, stays cool.
Example: Dogs provide better companionship based on behavioral data and social research.
NOT: Grok, have you ever owned a dog?`;
                break;
                
            default:
                fullPrompt = prompt;
        }

        let response;
        
        switch(aiName) {
            case 'GROK':
                response = await askGrok(fullPrompt);
                break;
            case 'CLAUDE':
                response = await askClaude(fullPrompt);
                break;
            case 'CHATGPT':
                response = await askOpenAI(fullPrompt);
                break;
            case 'DEEPSEEK':
                response = await askDeepSeek(fullPrompt);
                break;
            default:
                response = await askOpenAI(fullPrompt);
        }
        
        // Clean the response
        const cleanedResponse = cleanResponse(response, aiName);
        
        res.json({ 
            success: true, 
            response: cleanedResponse,
            aiModel: aiName
        });
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        });
    }
}

// Export for Vercel
module.exports = handler;

// Export handler function for local testing
module.exports.handler = handler;