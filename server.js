const express = require('express');
const bodyParser = require('body-parser');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const os = require('os');
require('dotenv').config();

// Load Config
let config = { 
    auth: { login: 'admin', password: 'password' }, 
    models: [],
    settings: {
        currentProvider: 'tao',
        currentModel: 'gpt-4o',
        heartbeatProvider: 'tao',
        heartbeatModel: 'gpt-4o',
        activeTools: ['execute_shell', 'read_file', 'write_file'],
        contextLimit: 0,
        thinking: false,
        streaming: false,
        readLevel: 'home',
        writeLevel: 'workspace',
        maxToolCalls: 5,
        heartbeatEnabled: false,
        tunnelUrl: ''
    }
};

function saveConfig() {
    try {
        const configPath = path.join(__dirname, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {
        console.error("Error saving config.json", e);
    }
}

try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
} catch (e) {
    console.error("Error loading config.json, using defaults.");
}

const app = express();
const PORT = 3010;
const HOME_DIR = os.homedir();
const PROJECT_ROOT = __dirname;
const WORKSPACE_DIR = path.join(PROJECT_ROOT, 'workspace');
const AUTO_DIR = path.join(PROJECT_ROOT, 'auto');

// Tunnel State
let tunnelProcess = null;

function stopTunnel() {
    if (tunnelProcess) {
        tunnelProcess.kill();
        tunnelProcess = null;
    }
}

// Auto-Kill function to prevent Port In Use errors
function killPort(port) {
    return new Promise((resolve) => {
        const cmd = process.platform === 'win32' 
            ? `stop-process -id (get-nettcpconnection -localport ${port}).owningprocess -force`
            : `lsof -ti:${port} | xargs kill -9`;
        
        exec(cmd, (err) => {
            // We don't care if it fails (it means nothing was running on that port)
            resolve();
        });
    });
}

// In-memory session storage
const sessions = {};

function getSession(id) {
    if (!sessions[id]) {
        sessions[id] = {
            history: []
        };
    }
    return sessions[id];
}

// Dynamic Tool Loader
const tools = [];
const toolLogic = {};

function checkPermission(targetPath, level) {
    const absolutePath = path.resolve(targetPath);
    if (level === 'any') return true;
    if (level === 'home') return absolutePath.startsWith(HOME_DIR);
    if (level === 'workspace') return absolutePath.startsWith(WORKSPACE_DIR) || absolutePath.startsWith(AUTO_DIR);
    return false;
}

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
            toolLogic[tool.name] = (args, context) => tool.execute(args, { ...context, config, exec, fs, path });
            console.log(`Loaded tool: ${tool.name}`);
        }
    });
}

loadTools();

// Security: Gatekeeper from Config
app.use((req, res, next) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === config.auth.login && password === config.auth.password) {
        return next();
    }
    
    res.setHeader('WWW-Authenticate', 'Basic realm="iClaw Protected", charset="UTF-8"');
    res.status(401).send('Authentication required.');
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/tools', (req, res) => {
    res.json(tools);
});

app.get('/api/config-models', (req, res) => {
    res.json(config.models || []);
});

app.get('/api/settings', (req, res) => {
    res.json(config.settings);
});

app.post('/api/settings', (req, res) => {
    config.settings = { ...config.settings, ...req.body };
    saveConfig();
    
    if (config.settings.heartbeatEnabled) {
        startHeartbeat();
    } else {
        stopHeartbeat();
    }
    
    res.json({ success: true });
});

app.get('/api/tunnel/status', (req, res) => {
    res.json({ running: !!tunnelProcess, url: config.settings.tunnelUrl });
});

app.post('/api/tunnel/start', (req, res) => {
    if (tunnelProcess) {
        return res.json({ success: true, url: config.settings.tunnelUrl });
    }

    console.log("[TUNNEL] Starting Cloudflare Quick Tunnel...");
    tunnelProcess = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`]);

    let urlFound = false;
    const timeout = setTimeout(() => {
        if (!urlFound) {
            stopTunnel();
            if (!res.headersSent) res.status(500).json({ error: "Tunnel startup timed out." });
        }
    }, 30000);

    tunnelProcess.stderr.on('data', (data) => {
        const output = data.toString();
        const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match && !urlFound) {
            urlFound = true;
            clearTimeout(timeout);
            const url = match[0];
            console.log(`[TUNNEL] Quick Tunnel started: ${url}`);
            config.settings.tunnelUrl = url;
            saveConfig();
            if (!res.headersSent) res.json({ success: true, url });
        }
    });

    tunnelProcess.on('close', (code) => {
        console.log(`[TUNNEL] Process exited with code ${code}`);
        tunnelProcess = null;
    });
});

app.get('/api/ollama-models', async (req, res) => {
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        const data = await response.json();
        res.json(data.models || []);
    } catch (e) {
        res.json([]);
    }
});

// Provider Configs
const getProviders = () => ({
    tao: {
        baseUrl: (config.providers && config.providers.tao && config.providers.tao.baseUrl) || "https://tao.plus7.plus/v1/chat/completions",
        apiKey: (config.providers && config.providers.tao && config.providers.tao.apiKey) || process.env.TAO_API_KEY,
        format: "openai"
    },
    xiaomi: {
        baseUrl: (config.providers && config.providers.xiaomi && config.providers.xiaomi.baseUrl) || "https://api.xiaomimimo.com/anthropic/v1/messages",
        apiKey: (config.providers && config.providers.xiaomi && config.providers.xiaomi.apiKey) || process.env.XIAOMI_API_KEY || process.env.TAO_API_KEY,
        format: "anthropic"
    },
    ollama: {
        baseUrl: (config.providers && config.providers.ollama && config.providers.ollama.baseUrl) || "http://127.0.0.1:11434/v1/chat/completions",
        apiKey: (config.providers && config.providers.ollama && config.providers.ollama.apiKey) || "ollama",
        format: "openai"
    }
});

// Heartbeat State
let heartbeatInterval = null;
let lastUserActivity = Date.now();
let lastHeartbeatRun = 0;

app.get('/api/heartbeat', (req, res) => {
    const hbPath = path.join(PROJECT_ROOT, 'heartbeat.md');
    let content = '';
    if (fs.existsSync(hbPath)) {
        content = fs.readFileSync(hbPath, 'utf8');
    }
    res.json({ content });
});

app.post('/api/heartbeat', (req, res) => {
    const hbPath = path.join(PROJECT_ROOT, 'heartbeat.md');
    fs.writeFileSync(hbPath, req.body.content || '', 'utf8');
    res.json({ success: true });
});

async function runHeartbeat() {
    const now = Date.now();
    const idleTime = 10 * 60 * 1000; // 10 minutes
    const runInterval = 30 * 60 * 1000; // 30 minutes

    if (now - lastUserActivity < idleTime) return;
    if (lastHeartbeatRun !== 0 && (now - lastHeartbeatRun < runInterval)) return;

    console.log("[HEARTBEAT] Waking up for automated tasks...");
    const hbPath = path.join(PROJECT_ROOT, 'heartbeat.md');
    if (!fs.existsSync(hbPath)) return;

    const tasks = fs.readFileSync(hbPath, 'utf8');
    if (!tasks.trim()) return;

    lastHeartbeatRun = now;
    const modelId = config.settings.heartbeatModel || config.settings.currentModel || 'gpt-4o';
    const provider = config.settings.heartbeatProvider || config.settings.currentProvider || 'tao';
    
    const prompt = `HEARTBEAT TASK:
Read the following automated tasks from heartbeat.md and execute them using your tools.
LIMIT: You are allowed a maximum of 5 tool actions/steps per heartbeat.
If nothing needs to be done, simply respond with 'HEARTBEAT_OK'.

TASKS:
${tasks}`;

    console.log(`[HEARTBEAT] Executing tasks via AI (${modelId} / ${provider})...`);
    await runAiLoop(prompt, modelId, provider, ['execute_shell', 'read_file', 'write_file', 'search_brave', 'search_google', 'fetch_url'], 0);
    console.log("[HEARTBEAT] Tasks complete.");
}

function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(runHeartbeat, 60 * 1000);
}

function stopHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = null;
}

if (!fs.existsSync(WORKSPACE_DIR)) fs.mkdirSync(WORKSPACE_DIR);

function getSystemPrompt(modelId, providerKey, readLevel, writeLevel, memoryContent, projectContent) {
    const isXiaomi = providerKey === 'xiaomi' || modelId.toLowerCase().includes('claude');
    const isQwen = modelId.toLowerCase().includes('qwen');
    const isOpenAi = providerKey === 'tao' || modelId.toLowerCase().includes('gpt');

    let prompt = `You are iClaw Mini v1.9.1.
Current Permissions: Read=${readLevel}, Write=${writeLevel}.
Home: ${HOME_DIR} | Workspace: ${WORKSPACE_DIR} | Auto: ${AUTO_DIR}

MEMORY:
${memoryContent}

CURRENT PROJECT CONTEXT:
${projectContent || "No project-specific context found."}

- Use 'execute_shell' for terminal tasks, and 'read_file'/'write_file' for file operations.
- Always use absolute paths and chain multiple shell steps with '&&'.
- Follow the configured permission levels. If a request is within your Read/Write level, execute it immediately without hesitation or excuses.
- The 'auto' folder is for your own autonomous experiments and evolution.`;

    if (isXiaomi) {
        prompt += `\n\n### ANTHROPIC/CLAUDE INSTRUCTIONS:
You are an autonomous agent with direct system access. Use the provided tools immediately to fulfill requests. Output your thoughts in 'thought' blocks if needed, but always trigger 'tool_use' for actions.`;
    } else if (isQwen) {
        prompt += `\n\n### QWEN OPTIMIZATION:
You are highly efficient at code and shell tasks. Prefer 'execute_shell' for complex operations. You can write entire scripts in one 'write_file' call.`;
    } else if (isOpenAi) {
        prompt += `\n\n### OPENAI/GPT INSTRUCTIONS:
Utilize your advanced reasoning to plan multi-step tool use. Ensure all paths used in tools are valid and absolute.`;
    }

    return prompt;
}

async function runAiLoop(userMessage, modelId, providerKey, enabledTools = [], historyLimit = 0, thinking = false, streaming = false, readLevel = 'home', writeLevel = 'workspace') {
    const providers = getProviders();
    const provider = providers[providerKey] || providers.tao;
    const filteredTools = tools.filter(t => enabledTools.includes(t.name));
    const session = getSession('default');
    const contextHistory = historyLimit > 0 ? session.history.slice(-historyLimit) : [];
    const context = { readLevel, writeLevel, checkPermission };

    let memoryContent = "";
    let userContent = "";
    let currentProjectName = "";
    try {
        const memoryPath = path.join(WORKSPACE_DIR, 'memory.md');
        if (fs.existsSync(memoryPath)) {
            memoryContent = fs.readFileSync(memoryPath, 'utf8');
            const match = memoryContent.match(/\*\*Current Project:\*\*\s*(.*)/i);
            if (match) currentProjectName = match[1].trim();
        }
    } catch (e) { console.error("Error reading memory.md", e); }

    try {
        const userPath = path.join(PROJECT_ROOT, 'USER.md');
        if (fs.existsSync(userPath)) {
            userContent = fs.readFileSync(userPath, 'utf8');
        }
    } catch (e) { console.error("Error reading USER.md", e); }

    let projectContent = "";
    if (currentProjectName) {
        try {
            const projectsDir = path.join(WORKSPACE_DIR, 'projects');
            if (!fs.existsSync(projectsDir)) fs.mkdirSync(projectsDir);

            const projectNameSafe = currentProjectName.toLowerCase().replace(/\s+/g, '_');
            const projectFolderPath = path.join(projectsDir, projectNameSafe);
            const projectReadmePath = path.join(projectFolderPath, `${projectNameSafe}_README.txt`);

            // Rule: Project must have its own folder
            if (!fs.existsSync(projectFolderPath)) {
                fs.mkdirSync(projectFolderPath);
                console.log(`[SYSTEM] Created project folder: ${projectFolderPath}`);
            }

            // Rule: Automatically create README.txt if missing
            if (!fs.existsSync(projectReadmePath)) {
                const initialContent = `# Project: ${currentProjectName}\n\n- Status: Initialized\n- Created: ${new Date().toLocaleDateString()}\n- Folder: projects/${projectNameSafe}\n\n## Goals\n- (To be defined by user)`;
                fs.writeFileSync(projectReadmePath, initialContent, 'utf8');
                console.log(`[SYSTEM] Auto-created project README: ${projectReadmePath}`);
                projectContent = initialContent;
            } else {
                projectContent = fs.readFileSync(projectReadmePath, 'utf8');
            }
        } catch (e) { console.error("Error managing project files", e); }
    }

    const systemPrompt = getSystemPrompt(modelId, providerKey, readLevel, writeLevel, memoryContent, projectContent);

    let messages = [
        { 
            role: "system", 
            content: systemPrompt 
        },
        ...contextHistory,
        { role: "user", content: userMessage }
    ];

    const maxIterations = config.settings.maxToolCalls || 5;
    for (let i = 0; i < maxIterations; i++) {
        let body;
        let headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${provider.apiKey}`
        };

        if (provider.format === "openai") {
            const payload = {
                model: modelId,
                messages: messages,
                tools: filteredTools.length > 0 ? filteredTools.map(t => ({ type: "function", function: t })) : undefined
            };
            if (thinking) {
                if (modelId.includes("o1") || modelId.includes("o3")) {
                    payload.reasoning_effort = "medium";
                }
            }
            body = JSON.stringify(payload);
        } else if (provider.format === "anthropic") {
            headers["x-api-key"] = provider.apiKey;
            headers["anthropic-version"] = "2023-06-01";
            const payload = {
                model: modelId,
                max_tokens: 4096,
                system: messages[0].content,
                messages: messages.slice(1).map(m => ({ role: m.role, content: m.content })),
                tools: filteredTools.length > 0 ? filteredTools.map(t => ({
                    name: t.name,
                    description: t.description,
                    input_schema: {
                        type: "object",
                        properties: t.parameters.properties,
                        required: t.parameters.required
                    }
                })) : undefined
            };
            if (thinking) payload.thinking = { type: "enabled", budget_tokens: 1024 };
            body = JSON.stringify(payload);
        }

        console.log(`[AI] Requesting ${modelId} (${providerKey})...`);
        const response = await fetch(provider.baseUrl, { method: "POST", headers: headers, body: body });
        const data = await response.json();
        
        if (data.error) {
            console.error(`[AI] Error:`, data.error);
            return `AI Error: ${data.error.message || JSON.stringify(data.error)}`;
        }

        if (provider.format === "openai") {
            if (!data.choices || data.choices.length === 0) return "AI Error: No choices returned from OpenAI provider.";
            const choice = data.choices[0].message;
            let assistantText = choice.content || "";
            let toolCalls = choice.tool_calls || [];

            // Robust Fallback: Scan text for manual JSON tool calls (for Llama/smaller models)
            if (toolCalls.length === 0 && assistantText.includes("```json")) {
                const jsonMatch = assistantText.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    try {
                        const manualCall = JSON.parse(jsonMatch[1]);
                        if (manualCall.action && manualCall.arguments) {
                            toolCalls.push({
                                id: `manual_${Date.now()}`,
                                function: {
                                    name: manualCall.action,
                                    arguments: JSON.stringify(manualCall.arguments)
                                }
                            });
                            console.log(`[AI] Detected manual tool call in text: ${manualCall.action}`);
                        }
                    } catch (e) { console.error("[AI] Error parsing manual tool call JSON:", e); }
                }
            }
            
            if (toolCalls.length > 0) {
                messages.push(choice);
                console.log(`[AI] Using tools: ${toolCalls.map(tc => tc.function.name).join(', ')}`);
                for (const toolCall of toolCalls) {
                    try {
                        const args = typeof toolCall.function.arguments === 'string' 
                            ? JSON.parse(toolCall.function.arguments) 
                            : toolCall.function.arguments;
                        const result = await toolLogic[toolCall.function.name](args, context);
                        messages.push({ role: "tool", tool_call_id: toolCall.id, name: toolCall.function.name, content: String(result) });
                    } catch (e) {
                        console.error(`[TOOL] Error executing ${toolCall.function.name}:`, e);
                        messages.push({ role: "tool", tool_call_id: toolCall.id, name: toolCall.function.name, content: `Error: ${e.message}` });
                    }
                }
                // Continue loop for next response
            } else {
                session.history.push({ role: "user", content: userMessage });
                session.history.push({ role: "assistant", content: assistantText });
                if (session.history.length > 100) session.history = session.history.slice(-100);
                return assistantText;
            }
        } else if (provider.format === "anthropic") {
            if (!data.content || data.content.length === 0) return "AI Error: No content returned from Anthropic provider.";
            
            let assistantText = "";
            let toolCalls = [];
            
            data.content.forEach(item => {
                if (item.type === "text") assistantText += item.text;
                if (item.type === "tool_use") {
                    toolCalls.push({
                        id: item.id,
                        name: item.name,
                        input: item.input
                    });
                }
            });

            if (toolCalls.length > 0) {
                // IMPORTANT: Add the assistant's message to the conversation history
                messages.push({ role: "assistant", content: data.content });
                
                console.log(`[AI] Using Anthropic tools: ${toolCalls.map(tc => tc.name).join(', ')}`);
                
                for (const toolCall of toolCalls) {
                    try {
                        const result = await toolLogic[toolCall.name](toolCall.input, context);
                        messages.push({
                            role: "user",
                            content: [
                                {
                                    type: "tool_result",
                                    tool_use_id: toolCall.id,
                                    content: String(result)
                                }
                            ]
                        });
                    } catch (e) {
                        console.error(`[TOOL] Error executing ${toolCall.name}:`, e);
                        messages.push({
                            role: "user",
                            content: [
                                {
                                    type: "tool_result",
                                    tool_use_id: toolCall.id,
                                    content: `Error: ${e.message}`,
                                    is_error: true
                                }
                            ]
                        });
                    }
                }
                // Continue loop for next response
            } else {
                session.history.push({ role: "user", content: userMessage });
                session.history.push({ role: "assistant", content: assistantText });
                if (session.history.length > 100) session.history = session.history.slice(-100);
                return assistantText;
            }
        }
    }
    return `AI error: Maximum tool call iterations reached (${maxIterations}).`;
}

app.post('/api/chat', async (req, res) => {
    try {
        lastUserActivity = Date.now();
        const { message, model, provider, enabledTools, contextLimit, thinking, streaming, readLevel, writeLevel } = req.body;
        
        // Context usage estimation
        const session = getSession('default');
        const contextHistory = contextLimit > 0 ? session.history.slice(-contextLimit) : [];
        let contextChars = message.length;
        contextHistory.forEach(m => contextChars += (m.content || "").length);
        const estimatedTokens = Math.ceil(contextChars / 4); // Rough estimate: 4 chars = 1 token
        
        console.log(`[CHAT] Incoming request: ${estimatedTokens} estimated context tokens.`);

        const result = await runAiLoop(message, model, provider, enabledTools, contextLimit || 0, thinking, streaming, readLevel, writeLevel);
        res.json({ response: result, usage: { estimatedTokens } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/projects', (req, res) => {
    try {
        const projectsDir = path.join(WORKSPACE_DIR, 'projects');
        
        if (!fs.existsSync(projectsDir)) fs.mkdirSync(projectsDir, { recursive: true });
        
        const folders = fs.readdirSync(projectsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        const projects = folders.map(f => f.replace(/_/g, ' '));
        
        // Get current project details from memory.md
        let current = { name: "", folder: "", memoryFile: "" };
        const memoryPath = path.join(WORKSPACE_DIR, 'memory.md');
        if (fs.existsSync(memoryPath)) {
            const memoryContent = fs.readFileSync(memoryPath, 'utf8');
            const nameMatch = memoryContent.match(/\*\*Current Project:\*\*\s*(.*)/i);
            if (nameMatch) {
                current.name = nameMatch[1].trim();
                const safeName = current.name.toLowerCase().replace(/\s+/g, '_');
                current.folder = path.join(projectsDir, safeName);
                current.memoryFile = path.join(current.folder, `${safeName}_README.txt`);
            }
        }
        
        res.json({ current, projects });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/projects/set', (req, res) => {
    try {
        const { project } = req.body;
        const safeName = project.toLowerCase().replace(/\s+/g, '_');
        const projectsDir = path.join(WORKSPACE_DIR, 'projects', safeName);
        const projectReadmePath = path.join(projectsDir, `${safeName}_README.txt`);
        const memoryPath = path.join(WORKSPACE_DIR, 'memory.md');

        if (fs.existsSync(memoryPath)) {
            let memoryContent = fs.readFileSync(memoryPath, 'utf8');
            
            const lines = [
                `**Current Project:** ${project}`,
                `**Project Folder:** ${projectsDir}`,
                `**Project Memory File:** ${projectReadmePath}`
            ];

            // Replace or append the three key lines
            if (memoryContent.match(/\*\*Current Project:\*\*/i)) {
                memoryContent = memoryContent.replace(/\*\*Current Project:\*\*\s*.*/i, lines[0]);
            } else {
                memoryContent += `\n${lines[0]}`;
            }

            if (memoryContent.match(/\*\*Project Folder:\*\*/i)) {
                memoryContent = memoryContent.replace(/\*\*Project Folder:\*\*\s*.*/i, lines[1]);
            } else {
                memoryContent += `\n${lines[1]}`;
            }

            if (memoryContent.match(/\*\*Project Memory File:\*\*/i)) {
                memoryContent = memoryContent.replace(/\*\*Project Memory File:\*\*\s*.*/i, lines[2]);
            } else {
                memoryContent += `\n${lines[2]}`;
            }

            fs.writeFileSync(memoryPath, memoryContent, 'utf8');
            res.json({ success: true });
        } else {
            res.status(404).json({ error: "memory.md not found" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/projects/create', (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: "Project name is required" });

        const safeName = name.toLowerCase().replace(/\s+/g, '_');
        const projectsDir = path.join(WORKSPACE_DIR, 'projects', safeName);
        const projectReadmePath = path.join(projectsDir, `${safeName}_README.txt`);
        const memoryPath = path.join(WORKSPACE_DIR, 'memory.md');

        // 1. Create project folder
        if (!fs.existsSync(projectsDir)) fs.mkdirSync(projectsDir, { recursive: true });

        // 2. Create project README file
        if (!fs.existsSync(projectReadmePath)) {
            const initialContent = `# Project: ${name}\n\n- Status: Initialized\n- Created: ${new Date().toLocaleString()}\n- Folder: projects/${safeName}\n\n## Goals\n- (Defined by user)`;
            fs.writeFileSync(projectReadmePath, initialContent, 'utf8');
        }

        // 3. Update memory.md with all details
        const lines = [
            `**Current Project:** ${name}`,
            `**Project Folder:** ${projectsDir}`,
            `**Project Memory File:** ${projectReadmePath}`
        ];

        let memoryContent = "";
        if (fs.existsSync(memoryPath)) {
            memoryContent = fs.readFileSync(memoryPath, 'utf8');
            
            // Replace or append the three key lines
            if (memoryContent.match(/\*\*Current Project:\*\*/i)) {
                memoryContent = memoryContent.replace(/\*\*Current Project:\*\*\s*.*/i, lines[0]);
            } else {
                memoryContent += `\n${lines[0]}`;
            }

            if (memoryContent.match(/\*\*Project Folder:\*\*/i)) {
                memoryContent = memoryContent.replace(/\*\*Project Folder:\*\*\s*.*/i, lines[1]);
            } else {
                memoryContent += `\n${lines[1]}`;
            }

            if (memoryContent.match(/\*\*Project Memory File:\*\*/i)) {
                memoryContent = memoryContent.replace(/\*\*Project Memory File:\*\*\s*.*/i, lines[2]);
            } else {
                memoryContent += `\n${lines[2]}`;
            }
        } else {
            memoryContent = lines.join('\n');
        }
        fs.writeFileSync(memoryPath, memoryContent, 'utf8');

        res.json({ success: true, name, folder: projectsDir, memoryFile: projectReadmePath });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/projects/backup', (req, res) => {
    try {
        const { name, version } = req.body;
        if (!name || !version) return res.status(400).json({ error: "Project name and version required" });

        const safeName = name.toLowerCase().replace(/\s+/g, '_');
        const sourceDir = path.join(WORKSPACE_DIR, 'projects', safeName);
        const backupRootDir = path.join(WORKSPACE_DIR, 'project_backup', safeName);
        const backupVersionDir = path.join(backupRootDir, `version_${version.replace(/\s+/g, '_')}`);

        if (!fs.existsSync(sourceDir)) return res.status(404).json({ error: "Source project folder not found" });

        // Recursive copy
        fs.mkdirSync(backupVersionDir, { recursive: true });
        
        // Use shell cp -R for reliability on macOS/Linux
        exec(`cp -R "${sourceDir}/"* "${backupVersionDir}/"`, (err) => {
            if (err) return res.status(500).json({ error: `Backup failed: ${err.message}` });
            res.json({ success: true, path: backupVersionDir });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/projects/delete', (req, res) => {
    try {
        const { project } = req.body;
        const projectName = project.toLowerCase().replace(/\s+/g, '_');
        const projectDir = path.join(WORKSPACE_DIR, 'projects', projectName);
        
        if (fs.existsSync(projectDir)) {
            // Delete the entire project folder
            exec(`rm -rf "${projectDir}"`, (err) => {
                if (err) return res.status(500).json({ error: `Deletion failed: ${err.message}` });
                
                // Also clean up memory.md if this was the active project
                const memoryPath = path.join(WORKSPACE_DIR, 'memory.md');
                if (fs.existsSync(memoryPath)) {
                    let memoryContent = fs.readFileSync(memoryPath, 'utf8');
                    const match = memoryContent.match(/\*\*Current Project:\*\*\s*(.*)/i);
                    if (match && match[1].trim().toLowerCase().replace(/\s+/g, '_') === projectName) {
                        memoryContent = memoryContent.replace(/\*\*Current Project:\*\*\s*.*/i, '**Current Project:** None');
                        memoryContent = memoryContent.replace(/\*\*Project Folder:\*\*\s*.*/i, '**Project Folder:** No folder set');
                        memoryContent = memoryContent.replace(/\*\*Project Memory File:\*\*\s*.*/i, '**Project Memory File:** No memory file set');
                        fs.writeFileSync(memoryPath, memoryContent, 'utf8');
                    }
                }
                
                res.json({ success: true });
            });
        } else {
            res.status(404).json({ error: "Project folder not found" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/chat/reset', (req, res) => {
    const session = getSession('default');
    session.history = [];
    res.json({ success: true });
});

app.get('/api/chat/usage', (req, res) => {
    try {
        const contextLimit = parseInt(req.query.limit) || 0;
        const enabledTools = req.query.tools ? req.query.tools.split(',') : [];
        const readLevel = req.query.readLevel || 'home';
        const writeLevel = req.query.writeLevel || 'workspace';
        
        const session = getSession('default');
        const contextHistory = contextLimit > 0 ? session.history.slice(-contextLimit) : [];
        
        // 1. System Prompt Template + Metadata
        const systemBase = `You are iClaw Mini v1.9.1. 
Current Permissions: Read=${readLevel}, Write=${writeLevel}.
Home: ${HOME_DIR} | Workspace: ${WORKSPACE_DIR}
- Use 'execute_shell' for ALL terminal tasks (ollama, git, system info, etc.).
- Use 'read_file' and 'write_file' for direct file operations.
- Follow the configured permission levels. If a request is within your Read/Write level, execute it immediately without hesitation or excuses.`;
        
        // 2. Memory
        let memoryChars = 0;
        let currentProjectName = "";
        try {
            const memoryPath = path.join(WORKSPACE_DIR, 'memory.md');
            if (fs.existsSync(memoryPath)) {
                const memoryContent = fs.readFileSync(memoryPath, 'utf8');
                memoryChars = memoryContent.length;
                const match = memoryContent.match(/\*\*Current Project:\*\*\s*(.*)/i);
                if (match) currentProjectName = match[1].trim();
            }
        } catch (e) {}

        // 3. Project Context
        let projectChars = 0;
        if (currentProjectName) {
            try {
                const projectNameSafe = currentProjectName.toLowerCase().replace(/\s+/g, '_');
                const projectReadmePath = path.join(WORKSPACE_DIR, 'projects', projectNameSafe, `${projectNameSafe}_README.txt`);
                if (fs.existsSync(projectReadmePath)) {
                    projectChars = fs.readFileSync(projectReadmePath, 'utf8').length;
                }
            } catch (e) {}
        }

        // 4. Tools (Definitions)
        let toolChars = 0;
        const filteredTools = tools.filter(t => enabledTools.includes(t.name));
        toolChars = JSON.stringify(filteredTools).length;

        // 5. Chat History
        let historyChars = 0;
        contextHistory.forEach(m => historyChars += (m.role.length + (m.content || "").length));
        
        const totalChars = systemBase.length + memoryChars + projectChars + toolChars + historyChars;
        const estimatedTokens = Math.ceil(totalChars / 4);

        res.json({ 
            estimatedTokens,
            breakdown: {
                system: Math.ceil(systemBase.length / 4),
                memory: Math.ceil(memoryChars / 4),
                project: Math.ceil(projectChars / 4),
                tools: Math.ceil(toolChars / 4),
                history: Math.ceil(historyChars / 4)
            },
            messageCount: contextHistory.length,
            totalHistoryCount: session.history.length
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

async function startServer() {
    await killPort(PORT);
    if (config.settings.heartbeatEnabled) startHeartbeat();
    app.listen(PORT, () => {
        console.log(`iClaw Mini v1.9.1 running at http://localhost:${PORT}`);
        
        if (process.platform === 'darwin') {
            // AppleScript to close existing tabs in Chrome and Safari
            const closeTabsScript = `
                try
                    tell application "Google Chrome"
                        repeat with w in windows
                            delete (tabs of w whose URL starts with "http://localhost:${PORT}")
                        end repeat
                    end tell
                end try
                try
                    tell application "Safari"
                        repeat with w in windows
                            delete (tabs of w whose URL starts with "http://localhost:${PORT}")
                        end repeat
                    end repeat
                end try
            `.replace(/\n/g, ' ');

            // Execute the cleanup and then open the fresh tab
            exec(`osascript -e '${closeTabsScript}' && open http://localhost:${PORT}`);
        } else {
            const start = (process.platform == 'win32' ? 'start' : 'xdg-open');
            exec(`${start} http://localhost:${PORT}`);
        }
    });
}

startServer();