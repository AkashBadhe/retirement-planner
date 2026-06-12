// Yahoo Finance historical data service
// Uses own backend API to proxy Yahoo Finance requests

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

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

  const formattedSymbol = formatSymbol(symbol);

  const url = `${API_BASE_URL}/finance/chart?symbol=${encodeURIComponent(formattedSymbol)}&period1=${period1}&period2=${period2}&interval=1d`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch data for ${symbol}. Please check the symbol and try again.`,
    );
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

  if (trimmed.startsWith('NSE:')) {
    return trimmed.replace('NSE:', '') + '.NS';
  }

  if (trimmed.startsWith('BSE:')) {
    return trimmed.replace('BSE:', '') + '.BO';
  }

  const indianSymbols = [
    'NIFTYBEES', 'GOLDBEES', 'LIQUIDBEES', 'BANKBEES', 'ITBEES',
    'INFY', 'TCS', 'RELIANCE', 'HDFCBANK', 'ICICIBANK', 'SBIN',
    'TATAMOTORS', 'WIPRO', 'HCLTECH', 'BAJFINANCE', 'LT',
    'ITC', 'KOTAKBANK', 'HINDUNILVR', 'AXISBANK', 'MARUTI',
  ];

  if (trimmed.includes('.')) {
    return trimmed;
  }

  if (indianSymbols.includes(trimmed)) {
    return trimmed + '.NS';
  }

  return trimmed;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  if (!query || query.length < 1) return [];

  try {
    const url = `${API_BASE_URL}/finance/search?q=${encodeURIComponent(query)}`;

    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();

    // Backend already returns the filtered/mapped array
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}

export async function getExchangeRate(from: string = 'USD', to: string = 'INR'): Promise<ExchangeRate> {
  const url = `${API_BASE_URL}/finance/exchange-rate?from=${from}&to=${to}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch exchange rate');
  }
  return response.json();
}
