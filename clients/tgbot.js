const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

async function postMessage(message, options = {}) {
    try {
        await bot.sendMessage(
            options.chatId ? options.chatId : process.env.TELEGRAM_CHAT_ID_LOW_THRESHOLD,
            message,
            options
        );
    } catch (e) {
        console.error('Error sending Telegram message:', e);
    }
}

module.exports = {
    postMessage,
};
