const { exec } = require('child_process');
const path = require('path');

module.exports = {
    name: 'take_screenshot',
    description: 'Takes a screenshot of the Mac screen and saves it to the Desktop for iCloud sync.',
    parameters: {
        type: 'object',
        properties: {
            filename: {
                type: 'string',
                description: 'Optional filename (e.g., my_screen.png). Defaults to timestamp.'
            }
        }
    },
    async execute(args, { exec }) {
        const desktopPath = '/Users/tim/Desktop';
        const name = args.filename || `screenshot_${Date.now()}.png`;
        const fullPath = path.join(desktopPath, name);
        
        return new Promise((resolve, reject) => {
            // -x: silent (no sound)
            exec(`screencapture -x "${fullPath}"`, (error) => {
                if (error) {
                    resolve(`Error taking screenshot: ${error.message}`);
                } else {
                    resolve(`Screenshot saved to Desktop: ${name}. It will sync to your phone via iCloud.`);
                }
            });
        });
    }
};