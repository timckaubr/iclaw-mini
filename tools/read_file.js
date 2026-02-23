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
    execute: async (args, { fs }) => {
        try {
            return fs.readFileSync(args.path, 'utf8');
        } catch (e) {
            return `Error reading file: ${e.message}`;
        }
    }
};