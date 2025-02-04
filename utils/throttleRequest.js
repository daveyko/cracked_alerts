// Throttled request with exponential backoff

// Rate limit configuration
const RATE_LIMIT_DELAY = 2000;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 1000;
let lastRequestTime = 0;

module.exports = async function throttledRequest(callback) {
    const now = Date.now();
    const timeToWait = Math.max(0, RATE_LIMIT_DELAY - (now - lastRequestTime));

    if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    
    lastRequestTime = Date.now();

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await callback();
        } catch (error) {
            if (error.message.includes('429')) {
                const backoffTime = INITIAL_BACKOFF * Math.pow(2, attempt);
                console.log(`Rate limit hit, retrying in ${backoffTime}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);

                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                    continue;
                }
            }
            throw error;
        }
    }
}