# iClaw Mini 

iClaw is a lightweight, remote-accessible AI agent framework that lets you control your Mac from anywhere via a browser or iOS device.

## Key Selling Points 🚀

- **Access Anywhere**: Built-in Cloudflare tunnel support allows you to securely reach your home Mac from any mobile network without complex VPNs.
- **Simple & Quick**: Optimized for mobile Safari and iOS WebViews with zero-latency response handling.
- **Local Power**: Seamless integration with **Ollama**. Perfect for running lightweight models like **Qwen 2.5 3B** or **Llama 3.2** directly on your hardware for privacy and speed.
- **Multi-Model Dashboard**: Toggle between OpenAI (GPT-4o), Google (Gemini), and local models with a single tap.
- **Pro Tools**: Remote shell execution, file reading, and system debugging from your pocket.

## Setup 🛠️

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file with your API keys (TAO, Xiaomi, etc.).

3. **Start iClaw**:
   ```bash
   node server.js
   ```

4. **Remote Access**:
   Start a Cloudflare tunnel pointing to port 3000:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

## Tech Stack 📚
- **Backend**: Node.js + Express
- **Frontend**: Vanilla JS + CSS (iOS-optimized UI)
- **Tunnel**: Cloudflare
- **Local AI**: Ollama
