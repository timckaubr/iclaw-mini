const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Tool Definitions
const tools = [
    {
        name: "execute_shell",
        description: "Execute a shell command on the host computer.",
        parameters: {
            type: "object",
            properties: {
                command: { type: "string", description: "The shell command to run." }
            },
            required: ["command"]
        }
    },
    {
        name: "read_file",
        description: "Read a file from the disk.",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file." }
            },
            required: ["path"]
        }
    }
];

// Tool Logic
const toolLogic = {
    execute_shell: (args) => {
        return new Promise((resolve) => {
            exec(args.command, (error, stdout, stderr) => {
                resolve(stdout || stderr || (error ? error.message : "Success"));
            });
        });
    },
    read_file: (args) => {
        try {
            return fs.readFileSync(args.path, 'utf8');
        } catch (e) {
            return `Error reading file: ${e.message}`;
        }
    }
};

// Provider Configs
const PROVIDERS = {
    tao: {
        baseUrl: "https://tao.plus7.plus/v1/chat/completions",
        apiKey: process.env.TAO_API_KEY,
        format: "openai"
    },
    xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/anthropic/v1/messages",
        apiKey: process.env.XIAOMI_API_KEY || process.env.TAO_API_KEY, // Fallback if not set
        format: "anthropic"
    },
    ollama: {
        baseUrl: "http://localhost:11434/v1/chat/completions",
        apiKey: "ollama",
        format: "openai"
    }
};

async function runAiLoop(userMessage, modelId, providerKey) {
    const provider = PROVIDERS[providerKey] || PROVIDERS.tao;
    let messages = [
        { role: "system", content: "You are Riceball Mini, a helpful AI assistant that can control the host Mac. Use tools to help the user." },
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
                tools: tools.map(t => ({ type: "function", function: t }))
            });
        } else if (provider.format === "anthropic") {
            // Basic Anthropic mapping for Xiaomi
            headers["x-api-key"] = provider.apiKey;
            headers["anthropic-version"] = "2023-06-01";
            body = JSON.stringify({
                model: modelId,
                max_tokens: 1024,
                system: messages[0].content,
                messages: messages.slice(1).map(m => ({ role: m.role, content: m.content })),
                // Xiaomi/Anthropic tools have a slightly different format, simplified here for now
            });
        }

        const response = await fetch(provider.baseUrl, {
            method: "POST",
            headers: headers,
            body: body
        });

        const data = await response.json();
        
        if (data.error) return `AI Error: ${data.error.message || JSON.stringify(data.error)}`;

        // Simplified response handling for multi-model
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
            return data.content[0].text; // Anthropic format
        }
    }
}

app.post('/api/chat', async (req, res) => {
    try {
        const { message, model, provider } = req.body;
        const result = await runAiLoop(message, model, provider);
        res.json({ response: result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Riceball Mini multi-model server running at http://localhost:${PORT}`);
});
