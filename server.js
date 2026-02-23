const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Dynamic Tool Loader
const tools = [];
const toolLogic = {};

function loadTools() {
    const toolsDir = path.join(__dirname, 'tools');
    if (!fs.existsSync(toolsDir)) fs.mkdirSync(toolsDir);
    
    fs.readdirSync(toolsDir).forEach(file => {
        if (file.endsWith('.js')) {
            const tool = require(path.join(toolsDir, file));
            tools.push({
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            });
            toolLogic[tool.name] = (args) => tool.execute(args, { exec, fs, path });
            console.log(`Loaded tool: ${tool.name}`);
        }
    });
}

loadTools();

// Security: Simple Gatekeeper (Full App Protection)
const auth = { login: 'timckaubr', password: 'riceball123' };

app.use((req, res, next) => {
    // Basic Auth Check
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === auth.login && password === auth.password) {
        return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="iClaw Protected"');
    res.status(401).send('Authentication required.');
});

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/api/tools', (req, res) => {
    res.json(tools);
});

// Provider Configs
const PROVIDERS = {
    tao: {
        baseUrl: "https://tao.plus7.plus/v1/chat/completions",
        apiKey: process.env.TAO_API_KEY,
        format: "openai"
    },
    xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/anthropic/v1/messages",
        apiKey: process.env.XIAOMI_API_KEY || process.env.TAO_API_KEY,
        format: "anthropic"
    },
    ollama: {
        baseUrl: "http://localhost:11434/v1/chat/completions",
        apiKey: "ollama",
        format: "openai"
    }
};

async function runAiLoop(userMessage, modelId, providerKey, enabledTools = []) {
    const provider = PROVIDERS[providerKey] || PROVIDERS.tao;
    const filteredTools = tools.filter(t => enabledTools.includes(t.name));

    let messages = [
        { role: "system", content: "You are iClaw Mini, a helpful AI assistant that can control the host Mac. Use tools only if they are available." },
        { role: "user", content: userMessage }
    ];

    for (let i = 0; i < 5; i++) {
        let body;
        let headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${provider.apiKey}`
        };

        if (provider.format === "openai") {
            body = JSON.stringify({
                model: modelId,
                messages: messages,
                tools: filteredTools.length > 0 ? filteredTools.map(t => ({ type: "function", function: t })) : undefined
            });
        } else if (provider.format === "anthropic") {
            headers["x-api-key"] = provider.apiKey;
            headers["anthropic-version"] = "2023-06-01";
            body = JSON.stringify({
                model: modelId,
                max_tokens: 1024,
                system: messages[0].content,
                messages: messages.slice(1).map(m => ({ role: m.role, content: m.content })),
            });
        }

        const response = await fetch(provider.baseUrl, {
            method: "POST",
            headers: headers,
            body: body
        });

        const data = await response.json();
        if (data.error) return `AI Error: ${data.error.message || JSON.stringify(data.error)}`;

        if (provider.format === "openai") {
            const choice = data.choices[0].message;
            if (choice.tool_calls) {
                messages.push(choice);
                for (const toolCall of choice.tool_calls) {
                    const result = await toolLogic[toolCall.function.name](JSON.parse(toolCall.function.arguments));
                    messages.push({ role: "tool", tool_call_id: toolCall.id, name: toolCall.function.name, content: String(result) });
                }
            } else {
                return choice.content;
            }
        } else {
            return data.content[0].text;
        }
    }
}

app.post('/api/chat', async (req, res) => {
    try {
        const { message, model, provider, enabledTools } = req.body;
        const result = await runAiLoop(message, model, provider, enabledTools);
        res.json({ response: result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`iClaw Mini v1.0.5 running at http://localhost:${PORT}`);
});