const { fetchTweets } = require('./fetchTweets');
const { analyzeTweets } = require('./analyzeTweets');
const { postMessage } = require('../clients/tgbot');

async function runTwitterAnalysis(contractAddress, tokenSymbol, username) {
    try {
        // Fetch tweets
        const xData = await fetchTweets(username);
        if (!xData.data || xData.data.length === 0) {
            console.log("No recent tweets found for the given query.");
            return;
        }

        const { data: tweets, includes } = xData;
        const { users } = includes;

        const user = users.find(user => user.id === tweets[0].author_id);
        const userName = user.name;
        const userHandle = user.username;
        const userMetrics = user.public_metrics;

        // Analyze tweets
        let message = `<b>${userName} (${userHandle})</b>
Followers: ${userMetrics.followers_count.toLocaleString()}`
        const analysis = await analyzeTweets(tweets, contractAddress, tokenSymbol);
        message += `\n\n${analysis}`

        // Send analysis to Telegram
        await postMessage(message, { parse_mode: 'HTML', disable_web_page_preview: true });
    } catch (error) {
        console.error('Error in runTwitterAnalysis:', error);
        throw error;
    }
}

module.exports = {
    runTwitterAnalysis
}
