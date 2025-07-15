const { isSOL, isUSDC, isStableCoin } = require('../utils/coinType');

function transactionOverPriceThreshold(transaction, solThreshold, usdcThreshold) {
    const {
        receivedTokenCA,
        receivedTokenPrice,
        receivedTokenAmount,
        spentTokenAmount,
        spentTokenPrice,
        spentTokenCA,
    } = transaction;
    if (isUSDC(receivedTokenCA)) {
        return receivedTokenAmount > usdcThreshold;
    }
    if (isUSDC(spentTokenCA)) {
        return spentTokenAmount > usdcThreshold;
    }
    if (isSOL(receivedTokenCA)) {
        return receivedTokenAmount > solThreshold;
    }
    if (isSOL(spentTokenCA)) {
        return spentTokenAmount > solThreshold;
    }
    if (!isStableCoin(receivedTokenCA) && !isStableCoin(spentTokenCA)) {
        return (
            receivedTokenAmount * receivedTokenPrice > usdcThreshold ||
            spentTokenAmount * spentTokenPrice > usdcThreshold
        );
    }
    throw new Error('Invalid transaction type');
}

function transactionOverVolumeThreshold(transaction) {
    const {
        receivedTokenCA,
        receivedTokenMetadata,
        spentTokenCA,
        spentTokenMetadata,
        transactionType,
    } = transaction;

    // Only skip if BOTH tokens are stablecoins or SOL
    if (
        (isStableCoin(receivedTokenCA) || isSOL(receivedTokenCA)) &&
        (isStableCoin(spentTokenCA) || isSOL(spentTokenCA))
    ) {
        return true;
    }

    // For SWAP transactions, prioritize the received token for analysis
    let tokenMetadata;
    if (transactionType === 'SWAP') {
        tokenMetadata = receivedTokenMetadata;
    } else {
        // Get the non-stablecoin token metadata
        tokenMetadata = !isStableCoin(receivedTokenCA) ? receivedTokenMetadata : spentTokenMetadata;
    }

    if (!tokenMetadata || !tokenMetadata.marketCap || !tokenMetadata.pairCreatedAt) {
        return false; // Missing required data
    }

    const marketCap = tokenMetadata.marketCap;
    const pairCreatedAt = tokenMetadata.pairCreatedAt;
    const currentTime = Date.now();
    const tokenAgeHours = (currentTime - pairCreatedAt) / (1000 * 60 * 60);
    const isNewToken = tokenAgeHours < 24;

    if (isNewToken) {
        const fiveMinVol = tokenMetadata.fiveMinVol ? tokenMetadata.fiveMinVol : 0;
        // For new tokens (<24 hours old)
        if (marketCap >= 100000 && marketCap < 1000000) {
            // $100K - $1M
            const requiredVolume = Math.max(1500, marketCap * 0.5); // $1500 or 50% of market cap
            return fiveMinVol >= requiredVolume;
        } else if (marketCap >= 1000000) {
            // $1M - $10M
            const estimated24HourVolume = fiveMinVol * 100; // Multiply by 100 for conservative estimate
            return estimated24HourVolume >= 500000; // $500K threshold
        }
        return false; // New tokens with <$100K market cap don't meet criteria
    } else {
        // For tokens with ≥24 hours of trading history
        const dailyVolume = tokenMetadata.dailyVol || 0;
        if (marketCap >= 1000000 && marketCap <= 10000000) {
            // $1M-$10M
            const requiredVolume = Math.max(500000, marketCap * 0.1); // $500K or 10% of market cap
            return dailyVolume >= requiredVolume;
        } else if (marketCap > 10000000) {
            // >$10M
            const requiredVolume = Math.max(1000000, marketCap * 0.05); // $1M or 5% of market cap
            return dailyVolume >= requiredVolume;
        }
        return false; // Tokens with <$1M market cap don't meet criteria
    }
}

module.exports = {
    transactionOverPriceThreshold,
    transactionOverVolumeThreshold,
};
