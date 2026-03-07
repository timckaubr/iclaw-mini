const fetch = require('node-fetch');

module.exports = {
    name: "generate_image",
    description: "Generate an image using the TAO provider API (model: gemini-3-pro-image-preview). Returns the URL of the generated image.",
    parameters: {
        type: "object",
        properties: {
            prompt: { type: "string", description: "A detailed description of the image to generate." }
        },
        required: ["prompt"]
    },
    execute: async (args, context) => {
        // Retrieve TAO API config
        const taoConfig = (context.config && context.config.providers && context.config.providers.tao) || {};
        const apiKey = taoConfig.apiKey || process.env.TAO_API_KEY;
        
        if (!apiKey) {
            return "Error: TAO_API_KEY is not configured in config.json or .env.";
        }
        
        let baseUrl = taoConfig.baseUrl || "https://tao.plus7.plus/v1/chat/completions";
        // Attempt to convert chat/completions endpoint to images/generations
        if (baseUrl.endsWith("/chat/completions")) {
            baseUrl = baseUrl.replace("/chat/completions", "/images/generations");
        } else if (baseUrl.endsWith("/v1")) {
            baseUrl = baseUrl + "/images/generations";
        }

        try {
            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gemini-3-pro-image-preview",
                    prompt: args.prompt,
                    n: 1
                })
            });

            if (!response.ok) {
                const text = await response.text();
                return `Error generating image: ${response.status} ${response.statusText} - ${text}`;
            }

            const data = await response.json();
            if (data.data && data.data.length > 0 && data.data[0].url) {
                return `Image generated successfully!\nURL: ${data.data[0].url}`;
            } else {
                return `Image generation API returned an unexpected response format: ${JSON.stringify(data)}`;
            }
        } catch (error) {
            return `Error generating image: ${error.message}`;
        }
    }
};
