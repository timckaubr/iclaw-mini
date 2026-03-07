const fetch = require('node-fetch');

module.exports = {
    name: "fetch_url",
    description: "Fetch the content of a URL (HTML or Text) and return it. Useful for reading web pages or API data.",
    parameters: {
        type: "object",
        properties: {
            url: { type: "string", description: "The full URL to fetch (e.g., https://example.com)." }
        },
        required: ["url"]
    },
    execute: async (args) => {
        try {
            const response = await fetch(args.url);
            if (!response.ok) {
                return `Error fetching URL: ${response.status} ${response.statusText}`;
            }
            const text = await response.text();
            // Basic cleanup to remove large script/style blocks for the AI
            return text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
                       .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
                       .substring(0, 5000); // Limit to 5000 chars for context safety
        } catch (error) {
            return `Error fetching URL: ${error.message}`;
        }
    }
};