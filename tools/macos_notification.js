module.exports = {
    name: "macos_notification",
    description: "Show a native macOS notification.",
    parameters: {
        type: "object",
        properties: {
            title: { type: "string", description: "Notification title." },
            message: { type: "string", description: "Notification message content." }
        },
        required: ["message"]
    },
    execute: async (args, { exec }) => {
        const title = args.title || "iClaw Mini";
        const cmd = `osascript -e 'display notification "${args.message}" with title "${title}"'`;
        exec(cmd);
        return "Notification sent.";
    }
};