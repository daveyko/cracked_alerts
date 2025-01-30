import { getAllTransactions, deleteTransactions } from './redis';

async function processTransactions() {
    console.log('Running transaction processor...');
    const transactions = await getAllTransactions();
    if (Object.keys(transactions).length === 0) {
        console.log('No new transactions to process.');
        return;
    }
    // Aggregate transactions
    const totalSol = Object.values(transactions).reduce((acc, tx) => acc + tx.amountSol, 0);
    const tokenIds = new Set(Object.values(transactions).map((tx) => tx.tokenId));
    // Send Telegram message
    const message = `🚀 **New Transaction Alert!**\n\n✅ **Total SOL Spent:** ${totalSol} SOL\n✅ **Tokens Bought:** ${Array.from(tokenIds).join(', ')}`;
    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
    // Delete processed transactions from Redis
    const transactionIds = Object.keys(transactions);
    await deleteTransactions(transactionIds);
    console.log(`Processed and cleared ${transactionIds.length} transactions.`);
}
