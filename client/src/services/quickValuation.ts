// Lightweight per-symbol valuation used by the watchlist table.
// Reuses the same fundamentals fetch + valuation engine as the detailed page.

import { fetchStockFundamentals } from './yahooFinance';
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
