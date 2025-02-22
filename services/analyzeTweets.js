const OpenAI = require('openai');

async function analyzeTweets(tweets, contractAddress, tokenSymbol) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const tweetTexts = tweets.map(tweet => tweet.text);
    const combinedText = tweetTexts.join(" ");

    const narrativePrompt = `
Analyze these tweets about the Solana token ${tokenSymbol} (${contractAddress}) and provide a concise analysis in exactly this format:

<b>Top 10 tweets analysis:</b>
• <b>Token Name Analysis:</b> [Name meaning and cultural references]
• <b>Core Purpose:</b> [If this is a utility project, provide 1-2 sentences on main project goal. If it's a meme project, provide 1-2 sentences on the meme and who mentioned it.]
• <b>Main Narrative:</b> [Key aspects of token distribution and economic model]
• <b>Team/Creator Background:</b> [Team info from tweets]
• <b>Utility Value:</b>
  - Tech: [Key technical features]
  - Project Fundamentals: [Current stage and focus]

Raw tweet data:
${combinedText}

Important:
- Use ONLY the format above
- Be direct and concise
- Skip sections with no information rather than explaining why
- Do not include disclaimers or caveats
`;

    try {
        const response = await openai.chat.completions.create({
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
            max_tokens: 500
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error("Error analyzing tweets:", error);
        return "Error analyzing tweets";
    }
}

module.exports = {
    analyzeTweets
}