const { fetchTweets } = require('./fetchTweets');
const { analyzeTweets } = require('./analyzeTweets');

async function runTwitterAnalysis(contractAddress, tokenSymbol) {
    // Fetch tweets
    const tweets = await fetchTweets(username);
    if (!tweets.data || tweets.data.length === 0) {
        console.log("No recent tweets found for the given query.");
        return;
    }

    // Analyze tweets
    const analysis = await analyzeTweets(tweets.data, contractAddress, tokenSymbol);
    console.log("Analysis:\n", analysis);
    // Send analysis to Telegram
    await postMessage(analysis, { parse_mode: 'HTML', disable_web_page_preview: true });
}

module.exports = {
    runTwitterAnalysis
}
