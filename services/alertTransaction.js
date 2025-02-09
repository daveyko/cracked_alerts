const { detectTokenSwap, tokenSwapMessage } = require('../transformers/tokenSwap');
const { PORTNOY_WALLET_ADDRESS, VIP_CHAT_ID } = require('../constants/vipChat');
const MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING = 200;
const MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING = 1;

async function transactionAlert(
    address,
    signature,
    rawTransaction,
    transaction,
    fetchDexTokenData,
    postMessage
) {
    const { stableTokenAmount, stableTokenSymbol } = transaction;
    if (
        shouldProcessTransactionAlert(stableTokenAmount, stableTokenSymbol) &&
        address === PORTNOY_WALLET_ADDRESS
    ) {
        const swapResult = await detectTokenSwap(rawTransaction, address, fetchDexTokenData);
        const message = tokenSwapMessage(swapResult, signature, address);
        await postMessage(message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            chatId: VIP_CHAT_ID,
        });
    }
}

function shouldProcessTransactionAlert(stableTokenAmount, stableTokenSymbol) {
    if (stableTokenSymbol === 'SOL') {
        return stableTokenAmount > MINIMUM_SOL_CHANGE_MULTI_WALLET_TRACKING;
    }
    if (stableTokenSymbol === 'USDC') {
        return stableTokenAmount > MINIMUM_USDC_CHANGE_MULTI_WALLET_TRACKING;
    }
    return false;
}

module.exports = {
    transactionAlert,
};
