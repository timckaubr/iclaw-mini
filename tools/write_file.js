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
    execute: async (args, { fs, path, writeLevel, checkPermission }) => {
        if (!checkPermission(args.path, writeLevel)) {
            return `Security Error: Write permission denied for this path under level: ${writeLevel}`;
        }

        try {
            const absolutePath = path.resolve(args.path);
            fs.writeFileSync(absolutePath, args.content, 'utf8');
            return `Successfully wrote to ${absolutePath}`;
        } catch (error) {
            return `Error writing file: ${error.message}`;
        }
    }
};