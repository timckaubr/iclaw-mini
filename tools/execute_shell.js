module.exports = {
    name: "execute_shell",
    description: "Execute ANY shell command on the host computer. Use this for file management, system info, running programs (like ollama, git, python), or any terminal task requested by the user.",
    parameters: {
        type: "object",
        properties: {
            command: { type: "string", description: "The full shell command to run (e.g. 'ls -la', 'ollama ps', 'git status')." }
        },
        required: ["command"]
    },
    execute: async (args, { exec }) => {
        return new Promise((resolve) => {
            exec(args.command, (error, stdout, stderr) => {
                if (error) {
                    resolve(stderr || error.message);
                } else {
                    resolve(stdout || "Success");
                }
            });
        });
    }
};