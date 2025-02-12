async function fetchTweets(username) {
    const query = `from:${username}`;
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=5&tweet.fields=public_metrics,created_at&user.fields=public_metrics&expansions=author_id&sort_order=relevancy`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
            }
        });

        const result = await response.json();

        // Sort tweets by total engagement (likes + retweets + replies + quotes)
        if (result.data) {
            result.data.sort((a, b) => {
                const engagementA = a.public_metrics.like_count +
                    a.public_metrics.retweet_count +
                    a.public_metrics.reply_count +
                    a.public_metrics.quote_count;
                const engagementB = b.public_metrics.like_count +
                    b.public_metrics.retweet_count +
                    b.public_metrics.reply_count +
                    b.public_metrics.quote_count;
                return engagementB - engagementA;  // Sort in descending order
            });
        }

        return result;
    } catch (error) {
        console.error("Error fetching tweets:", error);
        return { data: [] };
    }
}

module.exports = {
    fetchTweets,
};
