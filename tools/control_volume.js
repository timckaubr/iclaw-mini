module.exports = {
    name: "control_volume",
    description: "Set the system volume (0-100).",
    parameters: {
        type: "object",
        properties: {
            level: { type: "number", description: "Volume level from 0 to 100." }
        },
        required: ["level"]
    },
    execute: async (args, { exec }) => {
        const level = Math.max(0, Math.min(100, args.level));
        // AppleScript uses 0-7, but we can use 0-100 for percentage mapping or just use output volume
        const cmd = `osascript -e "set volume output volume ${level}"`;
        exec(cmd);
        return `Volume set to ${level}%.`;
    }
};