# iClaw Mini v2.0 

iClaw is a lightweight, remote-accessible AI agent framework for controlling your Mac from anywhere via a browser or mobile device.

## What's New in v2.0 🆕
- **Simple Memory System**: Persistent long-term memory via `memory.md` and project-specific context in `projects_md/`.
- **Manual Provider Config**: Edit API Base URLs and Keys for TAO, Xiaomi, and Ollama directly from the Web UI.
- **Improved Process Management**: Automatic cleanup of previous server processes to prevent port conflicts.
- **Enhanced Tooling**: Added Google Search (Custom Search API) and optimized shell execution.
- **Workspace-Centric**: Memory and project files are stored in the `workspace/` folder for consistent AI access.

## Key Selling Points 🚀
- **Access Anywhere**: One-click Cloudflare Tunneling lets you securely reach your Mac from any network.
- **Local Power**: Seamless Ollama integration for private, high-speed local AI (Qwen 2.5, Llama 3, etc.).
- **Pro-Grade Control**: Run shell commands, manage files, and debug system issues remotely.
- **Smart Heartbeat**: Automated task execution during idle time via `heartbeat.md`.

## Project Structure 📂

### Core
- **`server.js`**: Backend logic with dynamic tool loading and session management.
- **`config.json`**: Persistent settings for models, tools, and provider configurations.
- **`.env`**: Private API keys.

### Workspace (`workspace/`)
- **`memory.md`**: Long-term identity and project settings.
- **`projects_md/`**: Context files for specific projects.
- **`backups/`**: Local project version backups.

### Modular Tools (`tools/`)
Dynamic tool discovery including `execute_shell`, `read_file`, `write_file`, `macos_notification`, `control_volume`, `say_text`, `open_url`, `fetch_url`, and `search_brave`.

## Setup 🛠️
1. **Install**: `./setup.sh`
2. **Configure**: Set up `.env` or use the Web UI "Config" tab to set API keys.
3. **Run**: `./start.sh` (restarts port 3010 and clears old processes automatically).

## Tech Stack 📚
- **Backend**: Node.js + Express
- **Frontend**: Vanilla JS (iOS-optimized UI)
- **Local AI**: Ollama
- **Tunneling**: Cloudflare
