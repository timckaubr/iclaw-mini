module.exports = {
    name: "write_file",
    description: "Write content to a file on disk.",
    parameters: {
        type: "object",
        properties: {
            path: { type: "string", description: "Path to write the file." },
            content: { type: "string", description: "Content to write." }
        },
        required: ["path", "content"]
    },
    execute: async (args, { fs }) => {
        try {
            fs.writeFileSync(args.path, args.content);
            return `Successfully wrote to ${args.path}`;
        } catch (e) {
            return `Error writing file: ${e.message}`;
        }
    }
};