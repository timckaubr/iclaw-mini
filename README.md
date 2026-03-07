<div align="center">
  <img src="https://raw.githubusercontent.com/timckaubr/iclaw-mini/main/photo/logo.png" alt="iClaw mini" width="512">

  <h1>iClaw mini v2.0: Lightweight Remote AI Agent for Mac</h1>

  <h3>Control Your Mac from Anywhere · Local AI Power · Cloudflare Tunneling</h3>

  <p>
    <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/Platform-macOS-blue?style=flat&logo=apple&logoColor=white" alt="macOS">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
    <br>
    <a href="https://github.com/timckaubr/iclaw-mini"><img src="https://img.shields.io/badge/GitHub-iclaw--mini-black?style=flat&logo=github&logoColor=white" alt="GitHub"></a>
    <a href="https://github.com/timckaubr/iclaw-mini/releases"><img src="https://img.shields.io/badge/Releases-v2.0-blue?style=flat&logo=github&logoColor=white" alt="Releases"></a>
    <br>
    <a href="https://discord.gg/yourserver"><img src="https://img.shields.io/badge/Discord-Community-4c60eb?style=flat&logo=discord&logoColor=white" alt="Discord"></a>
    <a href="https://x.com/yourhandle"><img src="https://img.shields.io/badge/X_(Twitter)-Follow-black?style=flat&logo=x&logoColor=white" alt="Twitter"></a>
  </p>

[中文](README.zh.md) | [日本語](README.ja.md) | **English**

</div>

---

🦀 **iClaw mini** is a lightweight, remote-accessible AI agent framework designed specifically for controlling your Mac from anywhere via a browser or mobile device. Built with simplicity and power in mind, it brings pro-grade system control to your fingertips.

⚡️ **Access Anywhere**: One-click Cloudflare Tunneling lets you securely reach your Mac from any network. **Local Power**: Seamless Ollama integration for private, high-speed local AI.

> [!NOTE]
> **🎯 Project Focus**: iClaw mini v2.0 is optimized for **macOS** with a focus on remote accessibility, local AI integration, and simple configuration via a web-based UI.

## 📢 What's New in v2.0 🆕

- **Simple Memory System**: Persistent long-term memory via `memory.md` and project-specific context in `projects_md/`.
- **Manual Provider Config**: Edit API Base URLs and Keys for TAO, Xiaomi, and Ollama directly from the Web UI.
- **Improved Process Management**: Automatic cleanup of previous server processes to prevent port conflicts.
- **Enhanced Tooling**: Added Google Search (Custom Search API) and optimized shell execution.
- **Workspace-Centric**: Memory and project files are stored in the `workspace/` folder for consistent AI access.

## ✨ Key Selling Points 🚀

🪶 **Save Your Money**: Good memory management to reduce token usage.

<img src="https://raw.githubusercontent.com/timckaubr/iclaw-mini/main/photo/memory.png" alt="Memory Management" width="600">

⚡️ **Super Fast**: Optimized performance for quick responses.

🎯 **Simple and Easy to Use**: Intuitive interface and straightforward setup.

💪 **As Powerful as OpenClaw**: Full-featured remote control capabilities.

🔧 **Easily Config**: Simple configuration via Web UI or config files.

<img src="https://raw.githubusercontent.com/timckaubr/iclaw-mini/main/photo/config.png" alt="Easy Configuration" width="600">

|                               | Traditional Remote | **iClaw mini v2.0**                    |
| ----------------------------- | ------------------ | -------------------------------------- |
| **Setup Complexity**          | High               | **Low (One-click tunneling)**          |
| **AI Integration**            | Cloud-only         | **Local + Cloud (Ollama)**             |
| **Memory Footprint**          | Variable           | **Lightweight Node.js**                |
| **Cost**                      | Subscription fees  | **Free (Open Source)**                 |
| **Privacy**                   | Data sent to cloud | **Local processing option**            |

## 🏗️ Project Structure

```
iclaw_mini/
├── server.js              # Backend logic with dynamic tool loading
├── config.json            # Persistent settings for models, tools
├── .env                   # Private API keys
├── setup.sh               # Installation script
├── start.sh               # Launch script (auto-cleanup)
├── workspace/             # Memory and project files
│   ├── memory.md          # Long-term identity & settings
│   ├── projects_md/       # Project-specific context
│   └── backups/           # Local project version backups
├── tools/                 # Modular tools
│   ├── execute_shell      # Terminal tasks
│   ├── read_file          # File reading
│   ├── write_file         # File writing
│   ├── macos_notification # System notifications
│   ├── control_volume     # Audio control
│   ├── say_text           # Text-to-speech
│   ├── open_url           # Browser control
│   ├── fetch_url          # Web requests
│   └── search_brave       # Web search
└── public/                # Web UI frontend
```

## 🛠️ Setup

### Prerequisites
- macOS 12+ (Monterey or later)
- Node.js 18+
- (Optional) Ollama for local AI

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/timckaubr/iclaw-mini.git
   cd iclaw-mini
   ```

2. **Run the setup script:**
   ```bash
   ./setup.sh
   ```

3. **Configure your environment:**
   - Option A: Edit `.env` file with your API keys
   - Option B: Use the Web UI "Config" tab after starting

4. **Start the server:**
   ```bash
   ./start.sh
   ```

5. **Access the Web UI:**
   - Local: `http://localhost:3010`
   - Remote: Use Cloudflare Tunnel (one-click setup in UI)

## 🚀 Quick Start

### Basic Usage

1. **Start the server:**
   ```bash
   ./start.sh
   ```

2. **Open your browser:**
   - Navigate to `http://localhost:3010`

3. **Configure providers:**
   - Go to "Config" tab
   - Set up TAO, Xiaomi, or Ollama API keys

4. **Start interacting:**
   - Use the chat interface to control your Mac
   - Execute shell commands, manage files, and more

## 🔧 Configuration

### API Providers

Configure your AI providers in the Web UI or via `config.json`:

```json
{
  "providers": {
    "tao": {
      "api_key": "your-tao-api-key",
      "base_url": "https://api.tao.ai"
    },
    "xiaomi": {
      "api_key": "your-xiaomi-api-key",
      "base_url": "https://api.xiaomi.ai"
    },
    "ollama": {
      "base_url": "http://localhost:11434",
      "model": "qwen2.5:latest"
    }
  }
}
```

### Tools Configuration

Enable/disable tools in `config.json`:

```json
{
  "tools": {
    "execute_shell": true,
    "read_file": true,
    "write_file": true,
    "macos_notification": true,
    "control_volume": true,
    "say_text": true,
    "open_url": true,
    "fetch_url": true,
    "search_brave": true
  }
}
```

## 📚 Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JS (iOS-optimized UI)
- **Local AI**: Ollama
- **Tunneling**: Cloudflare
- **Search**: Brave Search API

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [OpenClaw](https://github.com/HKUDS/OpenClaw) and [PicoClaw](https://github.com/sipeed/picoclaw)
- Built with Node.js community packages
- Powered by Ollama for local AI

---

<div align="center">
  <p>Made with ❤️ by Master Au & iClaw</p>
  <p>
    <a href="https://github.com/timckaubr/iclaw-mini">GitHub</a> ·
    <a href="https://discord.gg/yourserver">Discord</a> ·
    <a href="https://x.com/yourhandle">Twitter</a>
  </p>
</div>