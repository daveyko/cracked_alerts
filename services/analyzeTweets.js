const { Configuration, OpenAIApi } = require('openai');

async function analyzeTweets(tweets, contractAddress, tokenSymbol) {
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const tweetTexts = tweets.map(tweet => tweet.text);
    const combinedText = tweetTexts.join(" ");

    const narrativePrompt = `
As a crypto analyst, evaluate the following tweets about the Solana token ${tokenSymbol} (${contractAddress}).

Context:
Crypto tokens/projects typically succeed through either:
1. Meme/Social value (influencers, trends, viral potential, current events)
2. Utility value (real-world use cases, technology, innovation)

Analyze these tweets and provide:
-Token Analysis:
   - Primary Category: [Meme/Utility/Hybrid]
   - Core Purpose: [Brief description]
   - Team/Creator Background: [If mentioned]

Raw Tweet Data:
${combinedText}

Provide a concise, structured analysis following the above format. If certain information is not available from the tweets, explicitly state that.
`;

    try {
        const response = await openai.createChatCompletion({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are an experienced cryptocurrency analyst with expertise in both technical and social analysis. You specialize in evaluating crypto projects by analyzing social signals, technical fundamentals, and market dynamics. Provide objective, data-driven analysis while highlighting both opportunities and risks. Be direct and concise in your assessments, and clearly indicate when you lack sufficient information for any analytical component."
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
    analyzeTweets
}