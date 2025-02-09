const { tokenSwapMessage } = require('../transformers/tokenSwap');

async function transactionAlert(data, postMessage, chatId) {
    const { swapResult, signature, address } = data;
    const message = tokenSwapMessage(swapResult, signature, address);
    await postMessage(message, { parse_mode: 'HTML', disable_web_page_preview: true, chatId });
}

module.exports = {
    transactionAlert,
};
