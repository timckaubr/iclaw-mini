const fetch = require('node-fetch');

module.exports = {
    name: "search_brave",
    description: "Search the web using Brave Search API. Returns titles, snippets, and URLs of search results.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "The search query." }
        },
        required: ["query"]
    },
    execute: async (args, context) => {
        const apiKey = (context.config && context.config.providers && context.config.providers.brave && context.config.providers.brave.apiKey) || process.env.BRAVE_API_KEY;
        if (!apiKey) {
            return "Error: BRAVE_API_KEY is not configured in config.json or .env.";
        }

        try {
            const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(args.query)}`, {
                headers: {
                    "Accept": "application/json",
                    "X-Subscription-Token": apiKey
                }
            });

            if (!response.ok) {
                return `Error searching Brave: ${response.status} ${response.statusText}`;
            }

            const data = await response.json();
            const results = data.web?.results || [];
            
            if (results.length === 0) return "No results found.";

            return results.slice(0, 5).map(r => 
                `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.description}\n`
            ).join('\n---\n');
        } catch (error) {
            return `Error searching Brave: ${error.message}`;
        }
    }
};