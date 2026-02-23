module.exports = {
    name: "say_text",
    description: "Make the Mac speak a text using the 'say' command.",
    parameters: {
        type: "object",
        properties: {
            text: { type: "string", description: "The text to speak." },
            voice: { type: "string", description: "Optional voice name (e.g., Samantha, Alex)." }
        },
        required: ["text"]
    },
    execute: async (args, { exec }) => {
        const voiceArg = args.voice ? `-v "${args.voice}"` : "";
        const cmd = `say ${voiceArg} "${args.text.replace(/"/g, '')}"`;
        exec(cmd);
        return "Speaking text...";
    }
};