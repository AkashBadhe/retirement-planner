// Yahoo Finance historical data service
// Uses the Yahoo Finance chart API via CORS proxy

const CORS_PROXY = 'https://corsproxy.io/?';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';

export interface HistoricalPrice {
  date: Date;
  close: number;
}

export interface StockMeta {
  symbol: string;
  currency: string;
  exchangeName: string;
  instrumentType: string;
  regularMarketPrice: number;
}

export interface YahooResponse {
  meta: StockMeta;
  prices: HistoricalPrice[];
}

export async function fetchHistoricalData(
  symbol: string,
  startDate: Date,
  endDate: Date,
): Promise<YahooResponse> {
  const period1 = Math.floor(startDate.getTime() / 1000);
  const period2 = Math.floor(endDate.getTime() / 1000);

  // For NSE stocks, append .NS if not already
  const formattedSymbol = formatSymbol(symbol);

  const url = `${CORS_PROXY}${encodeURIComponent(
    `${YAHOO_CHART_URL}${formattedSymbol}?period1=${period1}&period2=${period2}&interval=1d&events=history`,
  )}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch data for ${symbol}. Please check the symbol and try again.`);
  }

  const data = await response.json();

  if (data.chart?.error) {
    throw new Error(data.chart.error.description || 'Symbol not found');
  }

  const result = data.chart?.result?.[0];
  if (!result) {
    throw new Error('No data available for this symbol and date range.');
  }

  const timestamps: number[] = result.timestamp || [];
  const closes: number[] = result.indicators?.adjclose?.[0]?.adjclose ||
    result.indicators?.quote?.[0]?.close || [];

  const prices: HistoricalPrice[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null) {
      prices.push({
        date: new Date(timestamps[i] * 1000),
        close: closes[i],
      });
    }
  }

  const meta: StockMeta = {
    symbol: result.meta?.symbol || formattedSymbol,
    currency: result.meta?.currency || 'INR',
    exchangeName: result.meta?.exchangeName || '',
    instrumentType: result.meta?.instrumentType || '',
    regularMarketPrice: result.meta?.regularMarketPrice || 0,
  };

  return { meta, prices };
}

function formatSymbol(symbol: string): string {
  const trimmed = symbol.trim().toUpperCase();

  // If user typed "NSE:INFY" format, strip prefix and add .NS
  if (trimmed.startsWith('NSE:')) {
    return trimmed.replace('NSE:', '') + '.NS';
  }

  // If user typed "BSE:INFY" format, strip prefix and add .BO
  if (trimmed.startsWith('BSE:')) {
    return trimmed.replace('BSE:', '') + '.BO';
  }

  // Common Indian ETFs/stocks — if no exchange suffix, assume NSE
  const indianSymbols = [
    'NIFTYBEES', 'GOLDBEES', 'LIQUIDBEES', 'BANKBEES', 'ITBEES',
    'INFY', 'TCS', 'RELIANCE', 'HDFCBANK', 'ICICIBANK', 'SBIN',
    'TATAMOTORS', 'WIPRO', 'HCLTECH', 'BAJFINANCE', 'LT',
    'ITC', 'KOTAKBANK', 'HINDUNILVR', 'AXISBANK', 'MARUTI',
  ];

  // If it already has a suffix like .NS or .BO, keep it
  if (trimmed.includes('.')) {
    return trimmed;
  }

  // If it matches known Indian symbols, add .NS
  if (indianSymbols.includes(trimmed)) {
    return trimmed + '.NS';
  }

  // Otherwise return as-is (assumes US stock like AAPL, NVDA)
  return trimmed;
}

export function getSymbolSuggestions(): { label: string; value: string }[] {
  return [
    { label: 'NIFTYBEES (Nifty 50 ETF)', value: 'NIFTYBEES' },
    { label: 'GOLDBEES (Gold ETF)', value: 'GOLDBEES' },
    { label: 'INFY (Infosys)', value: 'INFY' },
    { label: 'TCS (TCS)', value: 'TCS' },
    { label: 'RELIANCE (Reliance)', value: 'RELIANCE' },
    { label: 'HDFCBANK (HDFC Bank)', value: 'HDFCBANK' },
    { label: 'ICICIBANK (ICICI Bank)', value: 'ICICIBANK' },
    { label: 'SBIN (SBI)', value: 'SBIN' },
    { label: 'AAPL (Apple - US)', value: 'AAPL' },
    { label: 'NVDA (Nvidia - US)', value: 'NVDA' },
    { label: 'VOO (S&P 500 ETF - US)', value: 'VOO' },
    { label: 'QQQ (Nasdaq ETF - US)', value: 'QQQ' },
  ];
}
