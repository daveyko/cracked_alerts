import { createClient } from 'redis';

const redisClient = createClient();

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export const connectRedis = async () => {
    await redisClient.connect();
};

// Write new transaction to Redis (Initially unprocessed)

/*
    type VersionedTransactionResponse = {
        The slot during which the transaction was processed
        slot: number;
        The transaction 
        transaction: {
            The transaction message 
            message: VersionedMessage;
            The transaction signatures 
            signatures: string[];
        };
        Metadata produced from the transaction 
        meta: ConfirmedTransactionMeta | null;
        The unix timestamp of when the transaction was processed 
        blockTime?: number | null;
        The transaction version 
        version?: TransactionVersion;
    }
*/
export async function addTransaction(transaction) {
    await connectRedis();
    const { slot } = transaction; // Unique key
    await redisClient.hSet('transactions', slot, JSON.stringify(transaction));
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
