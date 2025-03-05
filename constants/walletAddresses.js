const WALLET_ADDRESSES = [
    '3h65MmPZksoKKyEpEjnWU2Yk2iYT5oZDNitGy5cTaxoE', // JID (pumpfun aper)
    'GgG65z3MXpmGnV3ZapKv5ayDqox1x7CJnqP1LD8FaZdt', // y22 (100k to 1mil)
    'nPosUpnDtaB4dBaJUMF1bm78E4BTZDwWQWGoEmEyESx', // trippy (smart investor)
    '8zFZHuSRuDpuAR7J6FzwyF3vKNx4CVW3DFHJerQhc7Zd', // POW (KOL aper)
    'CKXzCmgNgQGonGvx9gpaHV9RXg1fHrMkQWmyzFuy4Cbv', // pnut insider
    'CRVidEDtEUTYZisCxBZkpELzhQc9eauMLR3FWg74tReL', // Frank
    '8deJ9xeUvXSJwicYptA9mHsU2rN2pDx37KWzkDkEXhU6', // Cooker
    '215nhcAHjQQGgwpQSJQ7zR26etbjjtVdW74NLzwEgQjP', // AP
    'DfMxre4cKmvogbLrPigxmibVTTQDuzjdXojWzjCXXhzj', // Euris
    'EHg5YkU2SZBTvuT87rUsvxArGp3HLeye1fXaSDfuMyaf', // TIL
    'EaVboaPxFCYanjoNWdkxTbPvt57nhXGu5i6m9m6ZS2kK', // Danny
    'G5nxEXuFMfV74DSnsrSatqCW32F34XUnBeq3PfDS7w5E', // Lebron 43.69% monthly winrate
    '2J4yED9RVQ9jEnj4t5AvKKVyxHH4eHiGxaLASy8mvPST', // Made 400k on Jelly 48% winrate
    '687kTFNvKG9GXf8UsPzyrKbKpz5ExNrSCWfs7S4PTGiL', // Made 500k on Jelly and 60k on Lux 40% winrate
    'dS8AzSWKkLunMja4CnAVBmJzpqTphfbqNQoQxPPagTv', // Overall cooker
    'GtyhzqA5ARhfMMn1weV7knuVMyYTJ2ipfVKrTGsjk7ZC', // 70% winrate
    'Efqoo7tUd9bhrA8kEZ6YhtBbo2mhr6VLAKzQEsBTyUsk', // 75% winrate
    // pranav dd wallets
    'DNfuF1L62WWyW3pNakVkyGGFzVVhj4Yr52jSmdTyeBHm', // pranav dd #1 swing trading, long term holds
    '4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9', // pranav dd #3 low cap snipes but mid cap swings
    'EHg5YkU2SZBTvuT87rUsvxArGp3HLeye1fXaSDfuMyaf', // pranav dd #4 snipes but mid caps swing trade. no high cap
    'DYAn4XpAkN5mhiXkRB7dGq4Jadnx6XYgu8L5b3WGhbrt', // pranav dd #5 Low to mid caps
    '2CXbN6nuTTb4vCrtYM89SfQHMMKGPAW4mvFe6Ht4Yo6z', // pranav dd #6 Low to mid caps
    'GfXQesPe3Zuwg8JhAt6Cg8euJDTVx751enp9EQQmhzPH', // pranav dd #7 bit of everything
    '7ABz8qEFZTHPkovMDsmQkm64DZWN5wRtU7LEtD2ShkQ6', // pranav dd #8 bit of everything low mid high swing trades
    'BXNiM7pqt9Ld3b2Hc8iT3mA5bSwoe9CRrtkSUs15SLWN', // pranav dd #9 low to mid caps
    '96sErVjEN7LNJ6Uvj63bdRWZxNuBngj56fnT9biHLKBf', // pranav dd #10 swing trading mid caps
    'GJA1HEbxGnqBhBifH9uQauzXSB53to5rhDrzmKxhSU65', // pranav dd #12 low to mid caps
    'BCnqsPEtA1TkgednYEebRpkmwFRJDCjMQcKZMMtEdArc', // pranav dd #13 Snipe and swing mid caps. Most coins go over 100k but stay under 10ms
    'BD7oWkEQsUwE8sj4UT7jtrGjHC8Gq1iRqXY7U6DTbJpf', // pranav dd #14 low to mid caps
    '7SDs3PjT2mswKQ7Zo4FTucn9gJdtuW4jaacPA65BseHS', // pranav dd #15 Solid snipes most snipes goin > 1m before sell off
    '5TuiERc4X7EgZTxNmj8PHgzUAfNHZRLYHKp4DuiWevXv', // pranav dd #17 mixed bag
    'CRVidEDtEUTYZisCxBZkpELzhQc9eauMLR3FWg74tReL', // pranav dd #18 Mix of low cap snipes and mid caps that go up to couple ms before dying.
    'ATFRUwvyMh61w2Ab6AZxUyxsAfiiuG1RqL6iv3Vi9q2B', // pranav dd #19 Swing trader trading on mid and high caps (finally)
    '6S8GezkxYUfZy9JPtYnanbcZTMB87Wjt1qx3c6ELajKC', // pranav dd #20 good mix
    'HABhDh9zrzf8mA4SBo1yro8M6AirH2hZdLNPpuvMH6iA', // bugha CT
    'HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp', // ansem alt maybe
    'DNfuF1L62WWyW3pNakVkyGGFzVVhj4Yr52jSmdTyeBHm', // Gake(SMsol5/50%insidery)
    '3tc4BVAdzjr1JpeZu6NAjLHyp4kK3iic7TexMBYGJ4Xk', // devvy
    //DK dd wallet
    '5rkPDK4JnVAumgzeV2Zu8vjggMTtHdDtrsd5o9dhGZHD', // PORTNOY
    '4WPTQA7BB4iRdrPhgNpJihGcxKh8T43gLjMn5PbEVfQw', // oura: infreq trade (3-4-25 last 30d 150k profit, 200k of sol)
    '4BdKaxN8G6ka4GYtQQWk4G4dZRUTX2vQH9GcXdBREFUk', // jijo: semifreq trade (3-4-25 last 30d 300k profit, 55k of sol)
    'BieeZkdnBAgNYknzo3RH2vku7FcPkFZMZmRJANh2TpW', // anon: semifreq trade (3-4-25 last 30d 2m profit, 50k of sol)
    'GitYucwpNcg6Dx1Y15UQ9TQn8LZMX1uuqQNn8rXxEWNC', // anon: huge sol bag might be exchange wallet (700M of sol)
];

const WALLET_NAMES = {
    '3h65MmPZksoKKyEpEjnWU2Yk2iYT5oZDNitGy5cTaxoE': 'JID (pumpfun aper)', // JID (pumpfun aper)
    GgG65z3MXpmGnV3ZapKv5ayDqox1x7CJnqP1LD8FaZdt: 'Y22 (500k to 5mil challenge)', // Y22 (100k to 1mil)
    nPosUpnDtaB4dBaJUMF1bm78E4BTZDwWQWGoEmEyESx: 'Trippy (smart/eng investor)', // Trippy (smart investor)
    '8zFZHuSRuDpuAR7J6FzwyF3vKNx4CVW3DFHJerQhc7Zd': 'POW (KOL aper)', // POW (KOL aper)
    CKXzCmgNgQGonGvx9gpaHV9RXg1fHrMkQWmyzFuy4Cbv: 'Pnut Insider', // Pnut Insider
    CRVidEDtEUTYZisCxBZkpELzhQc9eauMLR3FWg74tReL: 'FrankDeGods (Kolscan #2)', // Frank
    '8deJ9xeUvXSJwicYptA9mHsU2rN2pDx37KWzkDkEXhU6': 'Cooker', // Cooker
    '215nhcAHjQQGgwpQSJQ7zR26etbjjtVdW74NLzwEgQjP': 'AP (Kolscan #3)', // AP
    DfMxre4cKmvogbLrPigxmibVTTQDuzjdXojWzjCXXhzj: 'Euris (Kolscan #5)', // Euris
    EHg5YkU2SZBTvuT87rUsvxArGp3HLeye1fXaSDfuMyaf: 'TIL (Kolscan #6)', // TIL
    EaVboaPxFCYanjoNWdkxTbPvt57nhXGu5i6m9m6ZS2kK: 'Danny (Kolscan #7)', // Danny
    G5nxEXuFMfV74DSnsrSatqCW32F34XUnBeq3PfDS7w5E: 'Lebron', // Lebron
    '2J4yED9RVQ9jEnj4t5AvKKVyxHH4eHiGxaLASy8mvPST': 'Smart wallet #1 (50% WR)', // Jelly Smart Investor 50% wr
    '687kTFNvKG9GXf8UsPzyrKbKpz5ExNrSCWfs7S4PTGiL': 'Smart wallet #2 (40% WR)', // Made 500k on Jelly and 60k on Lux 40% winrate
    dS8AzSWKkLunMja4CnAVBmJzpqTphfbqNQoQxPPagTv: 'Smart wallet #3 (42% WR)', // Overall cooker
    GtyhzqA5ARhfMMn1weV7knuVMyYTJ2ipfVKrTGsjk7ZC: 'Smart wallet #4 (70% WR - doesnt trade much)', // 70% winrate
    Efqoo7tUd9bhrA8kEZ6YhtBbo2mhr6VLAKzQEsBTyUsk:
        'Smart wallet #5 (75% WR - doesnt trade much. usually sizes in)', // 75% winrate
    // pranav dd wallets
    DNfuF1L62WWyW3pNakVkyGGFzVVhj4Yr52jSmdTyeBHm: 'Pranav DD #1 (swing trading, long term holds)',
    '4vw54BmAogeRV3vPKWyFet5yf8DTLcREzdSzx4rw9Ud9':
        'Pranav DD #3 (low cap snipes but mid cap swings)',
    EHg5YkU2SZBTvuT87rUsvxArGp3HLeye1fXaSDfuMyaf:
        'Pranav DD #4 (snipes but mid caps swing trade. no high cap)',
    DYAn4XpAkN5mhiXkRB7dGq4Jadnx6XYgu8L5b3WGhbrt: 'Pranav DD #5 (Low to mid caps)',
    '2CXbN6nuTTb4vCrtYM89SfQHMMKGPAW4mvFe6Ht4Yo6z': 'Pranav DD #6 (Low to mid caps)',
    GfXQesPe3Zuwg8JhAt6Cg8euJDTVx751enp9EQQmhzPH: 'Pranav DD #7 (bit of everything)',
    '7ABz8qEFZTHPkovMDsmQkm64DZWN5wRtU7LEtD2ShkQ6':
        'Pranav DD #8 (bit of everything low mid high swing trades)',
    BXNiM7pqt9Ld3b2Hc8iT3mA5bSwoe9CRrtkSUs15SLWN: 'Pranav DD #9 (low to mid caps)',
    '96sErVjEN7LNJ6Uvj63bdRWZxNuBngj56fnT9biHLKBf': 'Pranav DD #10 (swing trading mid caps)',
    GJA1HEbxGnqBhBifH9uQauzXSB53to5rhDrzmKxhSU65: 'Pranav DD #12 (low to mid caps)',
    BCnqsPEtA1TkgednYEebRpkmwFRJDCjMQcKZMMtEdArc:
        'Pranav DD #13 (Snipe and swing mid caps. Most coins go over 100k but stay under 10ms)',
    BD7oWkEQsUwE8sj4UT7jtrGjHC8Gq1iRqXY7U6DTbJpf: 'Pranav DD #14 (low to mid caps)',
    '7SDs3PjT2mswKQ7Zo4FTucn9gJdtuW4jaacPA65BseHS':
        'Pranav DD #15 (Solid snipes most snipes goin > 1m before sell off)',
    '5TuiERc4X7EgZTxNmj8PHgzUAfNHZRLYHKp4DuiWevXv': 'Pranav DD #17 (mixed bag)',
    CRVidEDtEUTYZisCxBZkpELzhQc9eauMLR3FWg74tReL:
        'Pranav DD #18 (Mix of low cap snipes and mid caps that go up to couple ms before dying.)',
    ATFRUwvyMh61w2Ab6AZxUyxsAfiiuG1RqL6iv3Vi9q2B:
        'Pranav DD #19 (Swing trader trading on mid and high caps (finally))',
    '6S8GezkxYUfZy9JPtYnanbcZTMB87Wjt1qx3c6ELajKC': 'Pranav DD #20 (good mix)',
    '5rkPDK4JnVAumgzeV2Zu8vjggMTtHdDtrsd5o9dhGZHD': 'PORTNOY',
    HABhDh9zrzf8mA4SBo1yro8M6AirH2hZdLNPpuvMH6iA: 'Bugha CT',
    HYWo71Wk9PNDe5sBaRKazPnVyGnQDiwgXCFKvgAQ1ENp: 'Ansem Alt Maybe',
    DNfuF1L62WWyW3pNakVkyGGFzVVhj4Yr52jSmdTyeBHm: 'Gake (SMsol5/50%insidery)',
    '3tc4BVAdzjr1JpeZu6NAjLHyp4kK3iic7TexMBYGJ4Xk': 'Devvy',
    '4WPTQA7BB4iRdrPhgNpJihGcxKh8T43gLjMn5PbEVfQw': 'dk dd #1 oura',
    '4BdKaxN8G6ka4GYtQQWk4G4dZRUTX2vQH9GcXdBREFUk': 'dk dd #2 jijo',
    BieeZkdnBAgNYknzo3RH2vku7FcPkFZMZmRJANh2TpW: 'dk dd #3',
    GitYucwpNcg6Dx1Y15UQ9TQn8LZMX1uuqQNn8rXxEWNC: 'dk dd #4 (700M of sol)',
};

module.exports = {
    WALLET_ADDRESSES,
    WALLET_NAMES,
};
