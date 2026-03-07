module.exports = {
    name: "read_file",
    description: "Read a file from the disk.",
    parameters: {
        type: "object",
        properties: {
            path: { type: "string", description: "Path to the file." }
        },
        required: ["path"]
    },
    execute: async (args, { fs, readLevel, checkPermission }) => {
        if (!checkPermission(args.path, readLevel)) {
            return `Security Error: Read permission denied for this path under level: ${readLevel}`;
        }
        try {
            const data = fs.readFileSync(args.path, 'utf8');
            return data;
        } catch (error) {
            return `Error reading file: ${error.message}`;
        }
    }
};