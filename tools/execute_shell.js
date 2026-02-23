module.exports = {
    name: "execute_shell",
    description: "Execute a shell command on the host computer.",
    parameters: {
        type: "object",
        properties: {
            command: { type: "string", description: "The shell command to run." }
        },
        required: ["command"]
    },
    execute: async (args, { exec }) => {
        return new Promise((resolve) => {
            exec(args.command, (error, stdout, stderr) => {
                resolve(stdout || stderr || (error ? error.message : "Success"));
            });
        });
    }
};