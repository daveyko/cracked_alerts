import { createClient } from 'redis';

const redisClient = createClient();

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export const connectRedis = async () => {
    await redisClient.connect();
};

// Write new transaction to Redis (Initially unprocessed)

/*
    altTokenCA,
    altTokenName,
    altTokenMarketCap,
    altTokenPrice,
    boughtAmount: receivedAmount,
    boughtToken: receivedSymbol,
    soldAmount: spentAmount,
    soldToken: spentSymbol,
    transactionId,
    transactionType,
    walletName,
    }
*/
export async function addTransaction(transaction) {
    await connectRedis();
    const { transactionId } = transaction; // Unique key
    await redisClient.hSet('transactions', transactionId, JSON.stringify(transaction));
}

export async function getAllTransactions() {
    await connectRedis();
    const allTransactions = await redisClient.hGetAll('transactions');
    return Object.entries(allTransactions).reduce((acc, [key, value]) => {
        acc[key] = JSON.parse(value);
        return acc;
    }, {});
}

export async function deleteTransactions(transactionIds) {
    await connectRedis();
    await redisClient.hDel('transactions', ...transactionIds);
}
