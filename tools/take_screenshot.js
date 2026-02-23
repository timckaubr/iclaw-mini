module.exports = {
    name: "take_screenshot",
    description: "Capture the Mac screen and save it to the Desktop.",
    parameters: {
        type: "object",
        properties: {}
    },
    execute: async (args, { exec, path }) => {
        const timestamp = Date.now();
        const filename = `screenshot_${timestamp}.png`;
        const filepath = path.join('/Users/tim/Desktop', filename);
        return new Promise((resolve) => {
            exec(`screencapture -x "${filepath}"`, (error) => {
                if (error) resolve(`Failed to take screenshot: ${error.message}`);
                else resolve(`Screenshot saved to Desktop: ${filename}`);
            });
        });
    }
};