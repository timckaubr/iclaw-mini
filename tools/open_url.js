module.exports = {
    name: "open_url",
    description: "Open a URL in the default web browser.",
    parameters: {
        type: "object",
        properties: {
            url: { type: "string", description: "The URL to open." }
        },
        required: ["url"]
    },
    execute: async (args, { exec }) => {
        let url = args.url;
        if (!url.startsWith('http')) url = 'https://' + url;
        exec(`open "${url}"`);
        return `Opening ${url}...`;
    }
};