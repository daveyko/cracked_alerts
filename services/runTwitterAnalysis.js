const { Configuration, OpenAIApi } = require('openai');

async function runTwitterAnalysis(contractAddress, tokenSymbol) {
    // Fetch tweets
    const tweets = await fetchTweets(contractAddress, tokenSymbol);
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

async function fetchTweets(contractAddress, tokenSymbol) {
    const query = `$${tokenSymbol} OR ${contractAddress} (launch OR launched OR team OR utility OR roadmap OR investment OR founder OR built OR build OR building OR description)`;
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10&tweet.fields=public_metrics,created_at&sort_order=relevancy`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
            }
        });

        return await response.json();
    } catch (error) {
        console.error("Error fetching tweets:", error);
        return { data: [] };
    }
}

async function analyzeTweets(tweets, contractAddress, tokenSymbol) {
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const tweetTexts = tweets.map(tweet => tweet.text);
    const combinedText = tweetTexts.join(" ");

    const narrativePrompt = `
You are a crypto meme-coin analyst who specializes in identifying trends in new Solana tokens.

Analyze the following tweets about the Solana coin called ${tokenSymbol} with contract address ${contractAddress}.

Extract the key narrative behind this token:
1. **What is the token?** (Its purpose or meme narrative)
2. **Why was it created?** (Who made it? Any connections to notable figures or projects?)
3. **Why is it trending?** (Is it pumping because of hype, influencer backing, use case, or insider connections?)
4. **Is it a scam?** (Is it a pump and dump, or a legitimate project with a long-term vision?)
Summarize the narrative concisely in 500 characters or less.

Tweets for analysis:
${combinedText}
`;

    try {
        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a crypto meme-coin analyst who specializes in cryptocurrency trends."
                },
                {
                    role: "user",
                    content: narrativePrompt
                }
            ],
            max_tokens: 1000
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error analyzing tweets:", error);
        return "Error analyzing tweets";
    }
}

module.exports = {
    runTwitterAnalysis
}
