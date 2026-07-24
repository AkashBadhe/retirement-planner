// Lightweight per-symbol valuation used by the watchlist table.
// Reuses the same fundamentals fetch + valuation engine as the detailed page.

import { fetchStockFundamentals, fetchFundamentalsBatch, formatSymbol } from './yahooFinance';
import { calculateValuation } from './valuation';

export interface QuickValuation {
  symbol: string;
  currency: string;
  price: number;
  intrinsicValue: number;
  dcfValue: number;
  relativeValue: number;
  upsidePct: number;
  verdict: 'BUY' | 'ACCUMULATE' | 'HOLD' | 'AVOID' | 'EXIT';
  accumulationLevel: number;
  exitLevel: number;
  qualityScore: number;
  qualityRating: string;
  peRatio: number;
  roe: number;
  confidence: 'high' | 'medium' | 'low';
  sector: string;
  error?: string;
}

/** Build a QuickValuation from an already-fetched fundamentals object. */
export function valuationFromFundamentals(symbol: string, fundamentals: any): QuickValuation {
  if (!fundamentals) {
    return errorRow(symbol, 'No data');
  }
  const financialData = fundamentals.financialData || {};
  const summaryDetail = fundamentals.summaryDetail || {};
  const profile = fundamentals.summaryProfile || {};
  const currency = financialData.financialCurrency || summaryDetail.currency || 'INR';

  const v = calculateValuation(fundamentals, currency, {});

  return {
    symbol,
    currency,
    price: v.currentPrice,
    intrinsicValue: v.intrinsicValuePerShare,
    dcfValue: v.dcfValuePerShare,
    relativeValue: v.relativeValuePerShare,
    upsidePct: v.upsidePct,
    verdict: v.verdict,
    accumulationLevel: v.accumulationLevel,
    exitLevel: v.exitLevel,
    qualityScore: v.quality.score,
    qualityRating: v.quality.rating,
    peRatio: summaryDetail.trailingPE?.raw ?? 0,
    roe: financialData.returnOnEquity?.raw ? financialData.returnOnEquity.raw * 100 : 0,
    confidence: v.confidence.level,
    sector: profile.sector || '',
  };
}

function errorRow(symbol: string, message: string): QuickValuation {
  return {
    symbol, currency: 'INR', price: 0, intrinsicValue: 0, dcfValue: 0, relativeValue: 0,
    upsidePct: 0, verdict: 'AVOID', accumulationLevel: 0, exitLevel: 0, qualityScore: 0,
    qualityRating: 'N/A', peRatio: 0, roe: 0, confidence: 'low', sector: '', error: message,
  };
}

/**
 * Batch valuation for many symbols using the cached batch endpoint (one request).
 * Returns a map of the ORIGINAL symbol -> QuickValuation.
 */
export async function quickValuationBatch(
  symbols: string[],
  force = false,
): Promise<Record<string, QuickValuation>> {
  const out: Record<string, QuickValuation> = {};
  try {
    const dataMap = await fetchFundamentalsBatch(symbols, force);
    // The batch endpoint keys by the FORMATTED symbol; match back to originals.
    for (const original of symbols) {
      const formatted = formatSymbol(original);
      const data = dataMap[formatted] ?? dataMap[formatted.toUpperCase()] ?? null;
      out[original] = data ? valuationFromFundamentals(original, data) : errorRow(original, 'Failed to load');
    }
  } catch {
    for (const s of symbols) out[s] = errorRow(s, 'Failed to load');
  }
  return out;
}

export async function quickValuation(symbol: string): Promise<QuickValuation> {
  try {
    const fundamentals = await fetchStockFundamentals(symbol);
    const financialData = fundamentals.financialData || {};
    const summaryDetail = fundamentals.summaryDetail || {};
    const profile = fundamentals.summaryProfile || {};
    const currency = financialData.financialCurrency || summaryDetail.currency || 'INR';

    const v = calculateValuation(fundamentals, currency, {});

    return {
      symbol,
      currency,
      price: v.currentPrice,
      intrinsicValue: v.intrinsicValuePerShare,
      dcfValue: v.dcfValuePerShare,
      relativeValue: v.relativeValuePerShare,
      upsidePct: v.upsidePct,
      verdict: v.verdict,
      accumulationLevel: v.accumulationLevel,
      exitLevel: v.exitLevel,
      qualityScore: v.quality.score,
      qualityRating: v.quality.rating,
      peRatio: summaryDetail.trailingPE?.raw ?? 0,
      roe: financialData.returnOnEquity?.raw ? financialData.returnOnEquity.raw * 100 : 0,
      confidence: v.confidence.level,
      sector: profile.sector || '',
    };
  } catch (err: any) {
    return {
      symbol,
      currency: 'INR',
      price: 0,
      intrinsicValue: 0,
      dcfValue: 0,
      relativeValue: 0,
      upsidePct: 0,
      verdict: 'AVOID',
      accumulationLevel: 0,
      exitLevel: 0,
      qualityScore: 0,
      qualityRating: 'N/A',
      peRatio: 0,
      roe: 0,
      confidence: 'low',
      sector: '',
      error: err?.message || 'Failed to load',
    };
  }
}
