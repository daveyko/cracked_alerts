import tweepy
from openai import OpenAI
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Fetch API keys from environment variables
# Replace these with your actual API keys
TWITTER_API_KEY = 'jqKLkM86TiirgjmkzJHYUPNMO'
TWITTER_API_SECRET_KEY = 'Kt6dd8SoN6WQwa7weDDWGoiJS0cdvPBwxw4jQfv3qF65SdnwAu'
#bearer token
BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAABVwygEAAAAAMpqIFOabO2d2wNtxRMOYHxL0AoM%3DvI1qgH7ZFPvJTJHuRLkGrt5k0oqYaSFyeF4WzSiTYXuH6yrqnv'

TWITTER_ACCESS_TOKEN = '1616466721161740290-9yXgw4xx1vYQb6G67DQ7DgQu6OEc12'
TWITTER_ACCESS_TOKEN_SECRET = 'NTYYNagdgpYfnGapPyricEofloyB4pqe1qkbERGf4uMT1'
#open api key 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
OPENAI_API_KEY = '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'

# ✅ Use Twitter API v2 (since v1.1 is restricted)
client = tweepy.Client(bearer_token=BEARER_TOKEN, wait_on_rate_limit=True)

# Authenticate with OpenAI
openai_client = OpenAI(api_key=OPENAI_API_KEY)

def fetch_tweets(coin_ca):
    query = f"{coin_ca} lang:en"
    
    try:
        # ✅ Use Twitter API v2
        response = client.search_recent_tweets(query=query, max_results=10, tweet_fields=['public_metrics'])
        
        if response.data:
            return response.data
        return []

    except tweepy.errors.TweepyException as e:
        print(f"Error fetching tweets: {e}")
        return []

def analyze_tweets(tweets, coin_ca):
    tweet_texts = [tweet.text for tweet in tweets]
    combined_text = " ".join(tweet_texts)
    
    # Use OpenAI with GPT-3.5 Turbo (since GPT-4 is unavailable)
    response = openai_client.chat.completions.create(
        model="gpt-3.5-turbo",  # ✅ Use GPT-3.5 Turbo instead of GPT-4
        messages=[
            {"role": "system", "content": "You are a financial analyst who specializes in cryptocurrency trends."},
            {
                "role": "user",
                "content": f"Analyze the following tweets about the Solana coin with contract address {coin_ca} and explain what is the coin, wny was it made, and might have gone up or was bought also keep response to 500 characters or less:\n\n{combined_text}\n\nAnalysis:"
            }
        ],
        max_tokens=500
    )
    
    return response.choices[0].message.content

def main(coin_ca):
    tweets = fetch_tweets(coin_ca)
    if not tweets:
        print("No recent tweets found for the given query.")
        return
    
    analysis = analyze_tweets(tweets, coin_ca)
    print("Analysis:\n", analysis)

if __name__ == "__main__":
    coin_ca = "E14jecSeL6iiQk5obt8vPzpMYMhKXZpDYSBtEx8Bpump"
    main(coin_ca)