// api/chat.js - Full functionality restored

// Simple rate limiter
const lastCall = {};
const minInterval = 1000;

async function waitIfNeeded(apiName) {
    const now = Date.now();
    const last = lastCall[apiName] || 0;
    const timeSince = now - last;
    
    if (timeSince < minInterval) {
        const waitTime = minInterval - timeSince;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastCall[apiName] = Date.now();
}

// OpenAI API function
async function askOpenAI(prompt) {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not found');
    }
    
    await waitIfNeeded('openai');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI error: ${errorData?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Grok API function
async function askGrok(prompt) {
    const XAI_API_KEY = process.env.XAI_API_KEY;
    if (!XAI_API_KEY) {
        throw new Error('XAI API key not found');
    }
    
    await waitIfNeeded('grok');
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Grok error: ${errorData?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Claude API function
async function askClaude(prompt) {
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    if (!CLAUDE_API_KEY) {
        throw new Error('Claude API key not found');
    }
    
    await waitIfNeeded('claude');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Claude error: ${errorData?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.content[0].text.trim();
}

// DeepSeek API function
async function askDeepSeek(prompt) {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
        throw new Error('DeepSeek API key not found');
    }
    
    await waitIfNeeded('deepseek');
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek error: ${errorData?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
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
            
            console.log(`Calling ${aiName} API...`);
            
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
            
            console.log(`${aiName} response:`, cleanedResponse);
            
            return res.json({ 
                success: true, 
                response: cleanedResponse,
                aiModel: aiName
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
