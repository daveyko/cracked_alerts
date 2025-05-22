const cron = require('node-cron');
const { getSimulatedTradeStats } = require('../db/tradeSimulator');

async function generateDailySummary() {
    // Get stats for last 1 day and last 14 days
    const dailyStats = await getSimulatedTradeStats(1);
    const biWeeklyStats = await getSimulatedTradeStats(14);

    const message = formatSummaryMessage(dailyStats, biWeeklyStats);
    return message;
}

function formatSummaryMessage(dailyStats, biWeeklyStats) {
    return `
📊 <b>Simulated Trades Summary</b>

<b>Last 1 Day:</b>
• Total Trades: ${dailyStats.total_trades}
• Closed Trades: ${dailyStats.closed_trades}
• Total PnL: $${dailyStats.total_pnl?.toFixed(2) || '0.00'}
• Average PnL: $${dailyStats.avg_pnl?.toFixed(2) || '0.00'}
• Win Rate: ${(dailyStats.win_rate * 100)?.toFixed(1) || '0'}%

<b>Last 14 Days:</b>
• Total Trades: ${biWeeklyStats.total_trades}
• Closed Trades: ${biWeeklyStats.closed_trades}
• Total PnL: $${biWeeklyStats.total_pnl?.toFixed(2) || '0.00'}
• Average PnL: $${biWeeklyStats.avg_pnl?.toFixed(2) || '0.00'}
• Win Rate: ${(biWeeklyStats.win_rate * 100)?.toFixed(1) || '0'}%
`;
}

async function runSimulatedTrades(postMessage) {
    // Update all open trades
    await updateSimulatedTrades();
    // Generate and send daily summary
    const summaryMessage = await generateDailySummary();
    await postMessage(summaryMessage, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        chat_id: process.env.TELEGRAM_CHAT_ID_SIMULATED_TRADES,
    });
}

// Run at midnight UTC
async function runSimulatedTradesCron(postMessage) {
    cron.schedule('0 0 * * *', async () => {
        await runSimulatedTrades(postMessage);
    });
}

module.exports = {
    runSimulatedTradesCron,
};
