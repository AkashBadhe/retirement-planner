// Azure Function: Yahoo Finance CORS Proxy
// Deploy as an Azure Function App (Node.js runtime)

module.exports = async function (context, req) {
    const symbol = req.query.symbol;
    const period1 = req.query.period1;
    const period2 = req.query.period2;
    const interval = req.query.interval || '1d';

    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    // Handle preflight
    if (req.method === 'OPTIONS') {
        context.res = { status: 204, headers };
        return;
    }

    if (!symbol || !period1 || !period2) {
        context.res = {
            status: 400,
            headers,
            body: JSON.stringify({ error: 'Missing required params: symbol, period1, period2' }),
        };
        return;
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=${interval}&events=history`;

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        const data = await response.json();

        context.res = {
            status: response.status,
            headers,
            body: JSON.stringify(data),
        };
    } catch (error) {
        context.res = {
            status: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to fetch data from Yahoo Finance' }),
        };
    }
};
