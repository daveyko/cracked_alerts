const WALLET_ADDRESSES = [
    '3h65MmPZksoKKyEpEjnWU2Yk2iYT5oZDNitGy5cTaxoE', // JID (pumpfun aper)
    'GgG65z3MXpmGnV3ZapKv5ayDqox1x7CJnqP1LD8FaZdt', // y22 (100k to 1mil)
    'nPosUpnDtaB4dBaJUMF1bm78E4BTZDwWQWGoEmEyESx', // trippy (smart investor)
    '8zFZHuSRuDpuAR7J6FzwyF3vKNx4CVW3DFHJerQhc7Zd', // POW (KOL aper)
    'CKXzCmgNgQGonGvx9gpaHV9RXg1fHrMkQWmyzFuy4Cbv', // pnut insider
    'CRVidEDtEUTYZisCxBZkpELzhQc9eauMLR3FWg74tReL', // Frank
    'suqh5sHtr8HyJ7q8scBimULPkPpA557prMG47xCHQfK', // Cupsey
    '8deJ9xeUvXSJwicYptA9mHsU2rN2pDx37KWzkDkEXhU6', // Cooker
    '215nhcAHjQQGgwpQSJQ7zR26etbjjtVdW74NLzwEgQjP', // AP
    '9yYya3F5EJoLnBNKW6z4bZvyQytMXzDcpU5D6yYr4jqL', // Loopier
    'DfMxre4cKmvogbLrPigxmibVTTQDuzjdXojWzjCXXhzj', // Euris
    'EHg5YkU2SZBTvuT87rUsvxArGp3HLeye1fXaSDfuMyaf', // TIL
    'EaVboaPxFCYanjoNWdkxTbPvt57nhXGu5i6m9m6ZS2kK', // Danny
    'G5nxEXuFMfV74DSnsrSatqCW32F34XUnBeq3PfDS7w5E', // Lebron 43.69% monthly winrate
    '2J4yED9RVQ9jEnj4t5AvKKVyxHH4eHiGxaLASy8mvPST', // Made 400k on Jelly 48% winrate
    '687kTFNvKG9GXf8UsPzyrKbKpz5ExNrSCWfs7S4PTGiL', // Made 500k on Jelly and 60k on Lux 40% winrate
    'dS8AzSWKkLunMja4CnAVBmJzpqTphfbqNQoQxPPagTv', // Overall cooker
    'GtyhzqA5ARhfMMn1weV7knuVMyYTJ2ipfVKrTGsjk7ZC', // 70% winrate
    'Efqoo7tUd9bhrA8kEZ6YhtBbo2mhr6VLAKzQEsBTyUsk', // 75% winrate
];

const WALLET_NAMES = {
    '3h65MmPZksoKKyEpEjnWU2Yk2iYT5oZDNitGy5cTaxoE': 'JID (pumpfun aper)', // JID (pumpfun aper)
    'GgG65z3MXpmGnV3ZapKv5ayDqox1x7CJnqP1LD8FaZdt': 'Y22 (500k to 5mil challenge)', // Y22 (100k to 1mil)
    'nPosUpnDtaB4dBaJUMF1bm78E4BTZDwWQWGoEmEyESx': 'Trippy (smart/eng investor)', // Trippy (smart investor)
    '8zFZHuSRuDpuAR7J6FzwyF3vKNx4CVW3DFHJerQhc7Zd': 'POW (KOL aper)', // POW (KOL aper)
    'CKXzCmgNgQGonGvx9gpaHV9RXg1fHrMkQWmyzFuy4Cbv': 'Pnut Insider', // Pnut Insider
    'CRVidEDtEUTYZisCxBZkpELzhQc9eauMLR3FWg74tReL': 'FrankDeGods (Kolscan #2)', // Frank
    'suqh5sHtr8HyJ7q8scBimULPkPpA557prMG47xCHQfK': 'Cupsey (Kolscan #2)', // Cupsey
    '8deJ9xeUvXSJwicYptA9mHsU2rN2pDx37KWzkDkEXhU6': 'Cooker', // Cooker
    '215nhcAHjQQGgwpQSJQ7zR26etbjjtVdW74NLzwEgQjP': 'AP (Kolscan #3)', // AP
    '9yYya3F5EJoLnBNKW6z4bZvyQytMXzDcpU5D6yYr4jqL': 'Loopier (Kolscan #4)', // Loopier
    'DfMxre4cKmvogbLrPigxmibVTTQDuzjdXojWzjCXXhzj': 'Euris (Kolscan #5)', // Euris
    'EHg5YkU2SZBTvuT87rUsvxArGp3HLeye1fXaSDfuMyaf': 'TIL (Kolscan #6)', // TIL
    'EaVboaPxFCYanjoNWdkxTbPvt57nhXGu5i6m9m6ZS2kK': 'Danny (Kolscan #7)', // Danny
    'G5nxEXuFMfV74DSnsrSatqCW32F34XUnBeq3PfDS7w5E': 'Lebron', // Lebron
    '2J4yED9RVQ9jEnj4t5AvKKVyxHH4eHiGxaLASy8mvPST': 'Smart wallet #1 (50% WR)', // Jelly Smart Investor 50% wr
    '687kTFNvKG9GXf8UsPzyrKbKpz5ExNrSCWfs7S4PTGiL': 'Smart wallet #2 (40% WR)', // Made 500k on Jelly and 60k on Lux 40% winrate
    'dS8AzSWKkLunMja4CnAVBmJzpqTphfbqNQoQxPPagTv': 'Smart wallet #3 (42% WR)', // Overall cooker
    'GtyhzqA5ARhfMMn1weV7knuVMyYTJ2ipfVKrTGsjk7ZC': 'Smart wallet #4 (70% WR - doesnt trade much)', // 70% winrate
    'Efqoo7tUd9bhrA8kEZ6YhtBbo2mhr6VLAKzQEsBTyUsk': 'Smart wallet #5 (75% WR - doesnt trade much. usually sizes in)', // 75% winrate
};

module.exports = {
    WALLET_ADDRESSES,
    WALLET_NAMES
};