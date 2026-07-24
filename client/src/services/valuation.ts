// Stock valuation engine modeled on AlphaSpread's approach:
//   Intrinsic Value = average( DCF Value, Relative (multiples) Value )
//
// DCF Value: Free Cash Flow projected with a growth fade, discounted at WACC
//            (CAPM cost of equity + after-tax cost of debt), plus terminal value.
// Relative Value: fair value implied by sector-benchmark multiples
//            (P/E, P/S, P/B, EV/EBITDA), averaged.
//
// All figures are best-effort estimates from Yahoo Finance fundamentals and are
// intended for educational use, not investment advice.

export interface RegionParams {
  riskFreeRate: number; // decimal, e.g. 0.07
  equityRiskPremium: number; // decimal
  taxRate: number; // decimal
  terminalGrowth: number; // decimal
}

// Region defaults keyed by reporting currency
const REGION_PARAMS: Record<string, RegionParams> = {
  INR: { riskFreeRate: 0.069, equityRiskPremium: 0.07, taxRate: 0.25, terminalGrowth: 0.045 },
  USD: { riskFreeRate: 0.043, equityRiskPremium: 0.055, taxRate: 0.21, terminalGrowth: 0.02 },
  EUR: { riskFreeRate: 0.027, equityRiskPremium: 0.06, taxRate: 0.25, terminalGrowth: 0.018 },
  GBP: { riskFreeRate: 0.041, equityRiskPremium: 0.055, taxRate: 0.25, terminalGrowth: 0.018 },
  JPY: { riskFreeRate: 0.01, equityRiskPremium: 0.06, taxRate: 0.3, terminalGrowth: 0.01 },
  DEFAULT: { riskFreeRate: 0.045, equityRiskPremium: 0.06, taxRate: 0.25, terminalGrowth: 0.02 },
};

export function getRegionParams(currency: string): RegionParams {
  return REGION_PARAMS[currency?.toUpperCase()] || REGION_PARAMS.DEFAULT;
}

// Sector benchmark multiples (approximate global market averages).
// Used as the "fair multiple" proxy for relative valuation.
interface SectorMultiples {
  pe: number;
  ps: number;
  pb: number;
  evEbitda: number;
}

const SECTOR_MULTIPLES: Record<string, SectorMultiples> = {
  'Technology': { pe: 19, ps: 3.2, pb: 4.2, evEbitda: 12 },
  'Financial Services': { pe: 12, ps: 2.5, pb: 1.4, evEbitda: 9 },
  'Healthcare': { pe: 19, ps: 3, pb: 3.5, evEbitda: 13 },
  'Consumer Cyclical': { pe: 18, ps: 1.3, pb: 4, evEbitda: 11 },
  'Consumer Defensive': { pe: 20, ps: 1.5, pb: 4, evEbitda: 12 },
  'Industrials': { pe: 18, ps: 1.5, pb: 3.5, evEbitda: 11 },
  'Energy': { pe: 11, ps: 1, pb: 1.5, evEbitda: 5.5 },
  'Utilities': { pe: 16, ps: 2, pb: 1.6, evEbitda: 10 },
  'Real Estate': { pe: 24, ps: 5, pb: 2, evEbitda: 16 },
  'Basic Materials': { pe: 13, ps: 1.2, pb: 1.8, evEbitda: 8 },
  'Communication Services': { pe: 18, ps: 3, pb: 2.5, evEbitda: 8 },
};

const DEFAULT_MULTIPLES: SectorMultiples = { pe: 16, ps: 2, pb: 2.5, evEbitda: 10 };

function getSectorMultiples(sector: string): SectorMultiples {
  return SECTOR_MULTIPLES[sector] || DEFAULT_MULTIPLES;
}

// Safely read a Yahoo "raw" numeric field
function raw(obj: any, ...path: string[]): number | null {
  let cur = obj;
  for (const key of path) {
    if (cur == null) return null;
    cur = cur[key];
  }
  if (cur == null) return null;
  if (typeof cur === 'number') return cur;
  if (typeof cur.raw === 'number') return cur.raw;
  return null;
}

export interface WaccBreakdown {
  costOfEquity: number; // decimal
  costOfDebtAfterTax: number; // decimal
  equityWeight: number;
  debtWeight: number;
  beta: number;
  riskFreeRate: number;
  equityRiskPremium: number;
  wacc: number; // decimal
}

export interface ValuationAssumptions {
  initialGrowthRate: number; // decimal, year-1 FCF growth
  terminalGrowthRate: number; // decimal
  projectionYears: number;
  marginOfSafety: number; // decimal
}

export interface ConfidenceAssessment {
  level: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface QualityScore {
  score: number; // 0-100
  rating: 'Excellent' | 'Good' | 'Fair' | 'Weak';
  breakdown: { label: string; points: number; max: number }[];
}

export interface ValuationResult {
  dcfValuePerShare: number;
  relativeValuePerShare: number;
  intrinsicValuePerShare: number;
  currentPrice: number;
  upsidePct: number; // (intrinsic - price) / price
  wacc: WaccBreakdown | null;
  assumptions: ValuationAssumptions;
  // Relative valuation breakdown (per-share fair values by method)
  relativeBreakdown: { method: string; fairValue: number }[];
  // Sanity flags
  dcfReliable: boolean;
  relativeReliable: boolean;
  // Verdict
  verdict: 'BUY' | 'ACCUMULATE' | 'HOLD' | 'AVOID' | 'EXIT';
  accumulationLevel: number;
  exitLevel: number;
  baseFcf: number;
  dcfMethod: 'FCF' | 'Earnings' | 'none';
  effectiveDiscountRate: number;
  confidence: ConfidenceAssessment;
  quality: QualityScore;
  sharesOutstanding: number;
}

/**
 * Compute WACC using CAPM for cost of equity and an estimated after-tax cost of debt.
 *   Cost of Equity (CAPM) = Rf + beta * ERP
 *   Cost of Debt          = interestExpense / totalDebt  (fallback Rf + spread)
 *   WACC = E/V * Ke + D/V * Kd * (1 - tax)
 */
function computeWacc(fundamentals: any, region: RegionParams, marketCap: number): WaccBreakdown {
  const financialData = fundamentals.financialData || {};
  const keyStats = fundamentals.defaultKeyStatistics || {};
  const summaryDetail = fundamentals.summaryDetail || {};
  const balanceSheet = fundamentals.balanceSheetHistory?.balanceSheetStatements?.[0];
  const incomeStmt = fundamentals.incomeStatementHistory?.incomeStatementHistory?.[0];

  let beta = raw(keyStats, 'beta') ?? raw(summaryDetail, 'beta') ?? 1;
  // Clamp beta to a sane range
  if (beta <= 0) beta = 1;
  beta = Math.min(beta, 2.5);

  // Floor cost of equity at the region's risk-free rate + 2% minimum spread,
  // so zero-beta names still get a meaningful discount rate.
  const costOfEquity = Math.max(
    region.riskFreeRate + 0.02,
    region.riskFreeRate + beta * region.equityRiskPremium,
  );

  const totalDebt = raw(financialData, 'totalDebt')
    ?? raw(balanceSheet, 'totalDebt')
    ?? ((raw(balanceSheet, 'shortLongTermDebt') ?? 0) + (raw(balanceSheet, 'longTermDebt') ?? 0));

  // Estimate cost of debt
  const interestExpense = Math.abs(raw(incomeStmt, 'interestExpense') ?? 0);
  let costOfDebt = totalDebt > 0 && interestExpense > 0
    ? interestExpense / totalDebt
    : region.riskFreeRate + 0.02; // risk-free + 200bps spread fallback
  // Clamp cost of debt
  costOfDebt = Math.max(region.riskFreeRate, Math.min(costOfDebt, 0.18));
  const costOfDebtAfterTax = costOfDebt * (1 - region.taxRate);

  const equity = marketCap > 0 ? marketCap : 1;
  const debt = totalDebt > 0 ? totalDebt : 0;
  const v = equity + debt;
  const equityWeight = v > 0 ? equity / v : 1;
  const debtWeight = v > 0 ? debt / v : 0;

  let wacc = equityWeight * costOfEquity + debtWeight * costOfDebtAfterTax;
  // WACC must exceed terminal growth for a valid Gordon terminal value.
  // Floor at risk-free + 2% to prevent unrealistically low discount rates.
  wacc = Math.max(wacc, region.terminalGrowth + 0.02, region.riskFreeRate + 0.02);

  return {
    costOfEquity,
    costOfDebtAfterTax,
    equityWeight,
    debtWeight,
    beta,
    riskFreeRate: region.riskFreeRate,
    equityRiskPremium: region.equityRiskPremium,
    wacc,
  };
}

/**
 * Estimate the initial FCF growth rate using (in order of preference):
 *   1. Analyst long-term (+5y) earnings growth estimate
 *   2. Trailing earnings growth
 *   3. Revenue growth
 *   4. A conservative default
 * The result is clamped to a sensible range.
 */
export function estimateGrowthRate(fundamentals: any): number {
  const financialData = fundamentals.financialData || {};
  const trends = fundamentals.earningsTrend?.trend || [];

  const longTerm = trends.find((t: any) => t.period === '+5y');
  const analystGrowth = raw(longTerm, 'growth');

  const earningsGrowth = raw(financialData, 'earningsGrowth');
  const revenueGrowth = raw(financialData, 'revenueGrowth');

  let g = analystGrowth ?? earningsGrowth ?? revenueGrowth ?? 0.08;

  // Apply a moderate haircut: raw growth is optimistic over 10-year horizons, but
  // we shouldn't over-penalize genuinely high-growth names. Use a sliding haircut:
  // low growth keeps most of it, very high growth gets a bigger cut.
  if (g > 0.25) {
    // For very high growth (>25%), taper: keep first 25% fully, cut the rest by 50%
    g = 0.25 + (g - 0.25) * 0.5;
  }
  // Mild haircut on everything: 10% cut acknowledges optimism
  g = g * 0.9;

  // Cap differently by region (set by the caller's terminalGrowth context, but
  // since we don't have it here, use a generous 30% cap — the WACC handles the
  // discount appropriately per region)
  g = Math.max(0.03, Math.min(g, 0.30));
  return g;
}

/**
 * Determine the base Free Cash Flow to start the projection from.
 * Prefers reported FCF, falls back to operating cash flow minus capex.
 */
function getBaseFcf(fundamentals: any): number {
  const financialData = fundamentals.financialData || {};
  const cfStmt = fundamentals.cashflowStatementHistory?.cashflowStatements?.[0];

  let fcf = raw(financialData, 'freeCashflow') ?? 0;
  if (!fcf) {
    const ocf = raw(financialData, 'operatingCashflow')
      ?? raw(cfStmt, 'totalCashFromOperatingActivities') ?? 0;
    const capex = Math.abs(raw(cfStmt, 'capitalExpenditures') ?? 0);
    fcf = ocf - capex;
  }
  return fcf;
}

/**
 * Two-stage DCF: high growth for the first half of the projection (years 1–5),
 * then a linear fade to terminal growth over the second half (years 6–10),
 * followed by a Gordon Growth terminal value. This models how fast-growing
 * companies sustain elevated growth before maturity — matching AlphaSpread-style
 * valuations.
 */
function computeDcfPerShare(
  baseFcf: number,
  initialGrowth: number,
  terminalGrowth: number,
  wacc: number,
  netDebt: number,
  shares: number,
  projectionYears: number,
): number {
  if (baseFcf <= 0 || shares <= 0 || wacc <= terminalGrowth) return 0;

  const highGrowthYears = Math.ceil(projectionYears / 2); // 5 of 10
  const fadeYears = projectionYears - highGrowthYears; // 5

  let pvSum = 0;
  let fcf = baseFcf;
  for (let year = 1; year <= projectionYears; year++) {
    let growth: number;
    if (year <= highGrowthYears) {
      // Full growth rate for the first stage
      growth = initialGrowth;
    } else {
      // Linear fade from initialGrowth to terminalGrowth over the second stage
      const fadeProgress = (year - highGrowthYears) / fadeYears;
      growth = initialGrowth + (terminalGrowth - initialGrowth) * fadeProgress;
    }
    fcf = fcf * (1 + growth);
    pvSum += fcf / Math.pow(1 + wacc, year);
  }

  // Terminal value via Gordon Growth on the final projected FCF
  const terminalFcf = fcf * (1 + terminalGrowth);
  const terminalValue = terminalFcf / (wacc - terminalGrowth);
  const pvTerminal = terminalValue / Math.pow(1 + wacc, projectionYears);

  const enterpriseValue = pvSum + pvTerminal;
  const equityValue = enterpriseValue - netDebt;

  return equityValue > 0 ? equityValue / shares : 0;
}

/**
 * Two-stage earnings-based DCF for financials (mirrors the FCF version).
 */
function computeEarningsDcfPerShare(
  baseEarnings: number,
  initialGrowth: number,
  terminalGrowth: number,
  costOfEquity: number,
  shares: number,
  projectionYears: number,
): number {
  if (baseEarnings <= 0 || shares <= 0 || costOfEquity <= terminalGrowth) return 0;

  const highGrowthYears = Math.ceil(projectionYears / 2);
  const fadeYears = projectionYears - highGrowthYears;

  let pvSum = 0;
  let earnings = baseEarnings;
  for (let year = 1; year <= projectionYears; year++) {
    let growth: number;
    if (year <= highGrowthYears) {
      growth = initialGrowth;
    } else {
      const fadeProgress = (year - highGrowthYears) / fadeYears;
      growth = initialGrowth + (terminalGrowth - initialGrowth) * fadeProgress;
    }
    earnings = earnings * (1 + growth);
    pvSum += earnings / Math.pow(1 + costOfEquity, year);
  }

  const terminalEarnings = earnings * (1 + terminalGrowth);
  const terminalValue = terminalEarnings / (costOfEquity - terminalGrowth);
  const pvTerminal = terminalValue / Math.pow(1 + costOfEquity, projectionYears);

  const equityValue = pvSum + pvTerminal;
  return equityValue > 0 ? equityValue / shares : 0;
}

/**
 * Net income for earnings DCF. Prefers FORWARD earnings (analyst estimate for
 * next year × shares) over trailing, since for growth companies trailing
 * dramatically understates near-term earning power.
 */
function getBaseEarnings(fundamentals: any, shares: number): number {
  const keyStats = fundamentals.defaultKeyStatistics || {};
  const incomeStmt = fundamentals.incomeStatementHistory?.incomeStatementHistory?.[0];

  // Forward EPS × shares is the strongest starting point for a growth DCF
  const forwardEps = raw(keyStats, 'forwardEps');
  if (forwardEps != null && forwardEps > 0 && shares > 0) return forwardEps * shares;

  const netIncome = raw(keyStats, 'netIncomeToCommon')
    ?? raw(incomeStmt, 'netIncome');
  if (netIncome != null && netIncome > 0) return netIncome;

  const trailingEps = raw(keyStats, 'trailingEps');
  if (trailingEps != null && trailingEps > 0 && shares > 0) return trailingEps * shares;

  return 0;
}

/**
 * Revenue-based two-stage DCF for high-growth companies with low/negative
 * current profitability. Projects revenue at the growth rate, applies a target
 * mature net margin to get implied future earnings, and discounts at WACC.
 * This is how investment banks value early-stage, high-capex, or
 * reinvestment-heavy businesses (renewables, SaaS, biotech, etc.).
 */
function computeRevenueDcfPerShare(
  baseRevenue: number,
  initialGrowth: number,
  terminalGrowth: number,
  targetMargin: number,
  wacc: number,
  netDebt: number,
  shares: number,
  projectionYears: number,
): number {
  if (baseRevenue <= 0 || shares <= 0 || wacc <= terminalGrowth) return 0;

  const highGrowthYears = Math.ceil(projectionYears / 2);
  const fadeYears = projectionYears - highGrowthYears;

  let pvSum = 0;
  let revenue = baseRevenue;
  for (let year = 1; year <= projectionYears; year++) {
    let growth: number;
    if (year <= highGrowthYears) {
      growth = initialGrowth;
    } else {
      const fadeProgress = (year - highGrowthYears) / fadeYears;
      growth = initialGrowth + (terminalGrowth - initialGrowth) * fadeProgress;
    }
    revenue = revenue * (1 + growth);

    // Margin ramps linearly toward the target over the projection period
    const marginRamp = year / projectionYears;
    const margin = targetMargin * marginRamp + (targetMargin * 0.3) * (1 - marginRamp);
    const impliedFcf = revenue * margin;
    pvSum += impliedFcf / Math.pow(1 + wacc, year);
  }

  // Terminal: revenue at terminal growth, full target margin
  const terminalRevenue = revenue * (1 + terminalGrowth);
  const terminalFcf = terminalRevenue * targetMargin;
  const terminalValue = terminalFcf / (wacc - terminalGrowth);
  const pvTerminal = terminalValue / Math.pow(1 + wacc, projectionYears);

  const enterpriseValue = pvSum + pvTerminal;
  const equityValue = enterpriseValue - netDebt;
  return equityValue > 0 ? equityValue / shares : 0;
}

/**
 * Relative valuation: derive a fair price per share from sector-benchmark
 * multiples applied to the company's per-share fundamentals, then average the
 * available methods.
 */
function computeRelativePerShare(
  fundamentals: any,
  sector: string,
  shares: number,
  netDebt: number,
): { value: number; breakdown: { method: string; fairValue: number }[] } {
  const financialData = fundamentals.financialData || {};
  const keyStats = fundamentals.defaultKeyStatistics || {};
  const m = getSectorMultiples(sector);

  // Quality premium/discount: high-ROE, high-margin businesses deserve richer
  // multiples than the sector average (e.g. Apple), while weak ones deserve a
  // discount. This is what lets us tell a quality leader apart from a
  // richly-priced average company that happens to be in the same sector.
  const roe = raw(financialData, 'returnOnEquity') ?? 0;
  const netMargin = raw(financialData, 'profitMargins') ?? 0;
  const revenueGrowth = raw(financialData, 'revenueGrowth') ?? 0;
  const q = qualityFactor(roe, netMargin) * growthPremium(revenueGrowth);

  const pe = m.pe * q;
  const ps = m.ps * q;
  const pb = m.pb * q;
  const evEbitda = m.evEbitda * q;

  // Each method carries a reliability weight. Earnings/cash-flow multiples
  // (P/E, EV/EBITDA) are far more meaningful anchors than P/S or P/B, which
  // can wildly overstate value for richly-priced or asset-heavy companies.
  const weighted: { method: string; fairValue: number; weight: number }[] = [];

  // P/E -> fair price = sectorPE * EPS (prefer forward EPS for growth names)
  const forwardEps = raw(keyStats, 'forwardEps');
  const trailingEps = raw(keyStats, 'trailingEps');
  const eps = (forwardEps != null && forwardEps > 0) ? forwardEps : trailingEps;
  if (eps != null && eps > 0) {
    weighted.push({ method: 'P/E', fairValue: pe * eps, weight: 2.0 });
  }

  // EV/EBITDA -> fair EV = sectorMultiple * EBITDA; equity = EV - netDebt
  const ebitda = raw(financialData, 'ebitda');
  if (ebitda != null && ebitda > 0 && shares > 0) {
    const fairEv = evEbitda * ebitda;
    const fairEquity = fairEv - netDebt;
    if (fairEquity > 0) {
      weighted.push({ method: 'EV/EBITDA', fairValue: fairEquity / shares, weight: 1.5 });
    }
  }

  // P/S -> fair price = sectorPS * sales per share
  const revenue = raw(financialData, 'totalRevenue');
  if (revenue != null && revenue > 0 && shares > 0) {
    const salesPerShare = revenue / shares;
    weighted.push({ method: 'P/S', fairValue: ps * salesPerShare, weight: 0.75 });
  }

  // P/B -> fair price = sectorPB * book value per share
  const bookValue = raw(keyStats, 'bookValue');
  if (bookValue != null && bookValue > 0) {
    weighted.push({ method: 'P/B', fairValue: pb * bookValue, weight: 0.75 });
  }

  const breakdown = weighted.map(w => ({ method: w.method, fairValue: w.fairValue }));

  if (weighted.length === 0) {
    return { value: 0, breakdown };
  }

  const value = robustAggregate(weighted);
  return { value, breakdown };
}

/**
 * Multiplier applied to sector multiples reflecting business quality.
 * Driven by return on equity and net profit margin. Ranges ~0.7x (weak) to
 * ~1.5x (exceptional, e.g. Apple), so quality leaders keep a deserved premium
 * and weak businesses get marked down.
 */
function qualityFactor(roe: number, netMargin: number): number {
  let f = 1.0;

  if (roe >= 0.4) f += 0.3;
  else if (roe >= 0.25) f += 0.22;
  else if (roe >= 0.18) f += 0.12;
  else if (roe >= 0.12) f += 0.04;
  else if (roe > 0 && roe < 0.08) f -= 0.15;
  else if (roe <= 0) f -= 0.25;

  if (netMargin >= 0.25) f += 0.2;
  else if (netMargin >= 0.15) f += 0.12;
  else if (netMargin >= 0.08) f += 0.04;
  else if (netMargin > 0 && netMargin < 0.04) f -= 0.1;
  else if (netMargin <= 0) f -= 0.2;

  return Math.max(0.6, Math.min(1.5, f));
}

/**
 * Growth premium multiplier for relative valuation. High-growth companies in
 * low-multiple sectors (e.g. Adani Green in Utilities, or a hyper-growth SaaS
 * in Technology) genuinely deserve richer multiples than the sector average,
 * because the market prices in future earnings, not just current ones.
 * Ranges 1.0 (low growth) to 2.5 (>50% growth).
 */
function growthPremium(revenueGrowth: number): number {
  if (revenueGrowth >= 0.5) return 2.5;
  if (revenueGrowth >= 0.35) return 2.0;
  if (revenueGrowth >= 0.25) return 1.6;
  if (revenueGrowth >= 0.15) return 1.3;
  if (revenueGrowth >= 0.08) return 1.1;
  return 1.0;
}

/**
 * Weighted, outlier-trimmed aggregate of fair-value estimates. A plain mean is
 * easily skewed by a single distorted multiple (e.g. P/B for a company whose
 * book value is inflated by financial assets), so we drop values far from the
 * median and then take a reliability-weighted average of what remains.
 */
function robustAggregate(items: { fairValue: number; weight: number }[]): number {
  const vals = items.filter(i => i.fairValue > 0);
  if (vals.length === 0) return 0;
  if (vals.length === 1) return vals[0].fairValue;

  const sorted = [...vals].map(i => i.fairValue).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Keep values within 0.4x–2.5x of the median; drop the rest as outliers
  const kept = vals.filter(i => i.fairValue >= median * 0.4 && i.fairValue <= median * 2.5);
  const use = kept.length > 0 ? kept : vals;

  const totalWeight = use.reduce((s, i) => s + i.weight, 0);
  if (totalWeight <= 0) return use.reduce((s, i) => s + i.fairValue, 0) / use.length;
  return use.reduce((s, i) => s + i.fairValue * i.weight, 0) / totalWeight;
}

function getVerdict(
  currentPrice: number,
  intrinsicValue: number,
  accumulationLevel: number,
  exitLevel: number,
): 'BUY' | 'ACCUMULATE' | 'HOLD' | 'AVOID' | 'EXIT' {
  if (intrinsicValue <= 0) return 'AVOID';
  if (currentPrice <= accumulationLevel) return 'BUY';
  if (currentPrice <= intrinsicValue * 0.9) return 'ACCUMULATE';
  if (currentPrice <= intrinsicValue * 1.05) return 'HOLD';
  if (currentPrice >= exitLevel) return 'EXIT';
  return 'AVOID';
}

/**
 * Business quality score (0–100) from profitability, financial health, and
 * growth — a single at-a-glance gauge of how good the underlying business is,
 * independent of valuation.
 */
function computeQualityScore(fundamentals: any): QualityScore {
  const financialData = fundamentals.financialData || {};
  const roe = (raw(financialData, 'returnOnEquity') ?? 0) * 100;
  const netMargin = (raw(financialData, 'profitMargins') ?? 0) * 100;
  const opMargin = (raw(financialData, 'operatingMargins') ?? 0) * 100;
  const debtToEquity = raw(financialData, 'debtToEquity') ?? 0;
  const revenueGrowth = (raw(financialData, 'revenueGrowth') ?? 0) * 100;
  const fcf = raw(financialData, 'freeCashflow') ?? 0;

  const breakdown: { label: string; points: number; max: number }[] = [];

  // Return on equity (max 25)
  let roePts = 0;
  if (roe >= 25) roePts = 25;
  else if (roe >= 18) roePts = 21;
  else if (roe >= 12) roePts = 15;
  else if (roe >= 8) roePts = 9;
  else if (roe > 0) roePts = 4;
  breakdown.push({ label: 'Return on Equity', points: roePts, max: 25 });

  // Net margin (max 20)
  let marginPts = 0;
  if (netMargin >= 20) marginPts = 20;
  else if (netMargin >= 12) marginPts = 16;
  else if (netMargin >= 6) marginPts = 10;
  else if (netMargin > 0) marginPts = 5;
  breakdown.push({ label: 'Net Margin', points: marginPts, max: 20 });

  // Operating margin (max 15)
  let opPts = 0;
  if (opMargin >= 20) opPts = 15;
  else if (opMargin >= 12) opPts = 12;
  else if (opMargin >= 6) opPts = 7;
  else if (opMargin > 0) opPts = 3;
  breakdown.push({ label: 'Operating Margin', points: opPts, max: 15 });

  // Balance sheet — debt to equity (max 20). Lower is better.
  let debtPts: number;
  if (debtToEquity <= 25) debtPts = 20;
  else if (debtToEquity <= 50) debtPts = 16;
  else if (debtToEquity <= 100) debtPts = 11;
  else if (debtToEquity <= 200) debtPts = 5;
  else debtPts = 0;
  breakdown.push({ label: 'Balance Sheet (D/E)', points: debtPts, max: 20 });

  // Free cash flow generation (max 10)
  const fcfPts = fcf > 0 ? 10 : 0;
  breakdown.push({ label: 'Positive Free Cash Flow', points: fcfPts, max: 10 });

  // Revenue growth (max 10)
  let growthPts = 0;
  if (revenueGrowth >= 15) growthPts = 10;
  else if (revenueGrowth >= 8) growthPts = 7;
  else if (revenueGrowth >= 3) growthPts = 4;
  else if (revenueGrowth > 0) growthPts = 2;
  breakdown.push({ label: 'Revenue Growth', points: growthPts, max: 10 });

  const score = Math.round(breakdown.reduce((s, b) => s + b.points, 0));
  let rating: QualityScore['rating'] = 'Weak';
  if (score >= 80) rating = 'Excellent';
  else if (score >= 60) rating = 'Good';
  else if (score >= 40) rating = 'Fair';

  return { score, rating, breakdown };
}

/**
 * Judge how much to trust the estimate. Flags common situations where a generic
 * model produces unreliable numbers (no DCF, methods disagreeing, extreme
 * deviation from market price, too few data points).
 */
function assessConfidence(input: {
  dcfReliable: boolean;
  relativeReliable: boolean;
  relativeBreakdown: { method: string; fairValue: number }[];
  upsidePct: number;
  intrinsicValuePerShare: number;
  bothMethods: boolean;
  dcfVsRelative: number; // fractional gap between DCF and relative
}): ConfidenceAssessment {
  const reasons: string[] = [];
  let score = 0; // higher = less reliable

  if (input.intrinsicValuePerShare <= 0) {
    return {
      level: 'low',
      reasons: ['We could not compute a reliable value from the available data for this stock.'],
    };
  }

  if (!input.dcfReliable) {
    reasons.push('The cash-flow (DCF) valuation could not be computed, so the estimate relies on valuation multiples alone.');
    score += 2;
  }

  // Dispersion across the relative multiple methods
  const vals = input.relativeBreakdown.map(b => b.fairValue).filter(v => v > 0);
  if (vals.length >= 2) {
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    if (cv > 0.6) {
      reasons.push('The valuation multiples (P/E, P/B, etc.) disagree widely with each other.');
      score += 2;
    }
  } else if (vals.length === 1 && !input.dcfReliable) {
    reasons.push('Only a single valuation method had enough data, so the estimate is fragile.');
    score += 2;
  }

  // DCF and relative methods pointing in very different directions
  if (input.bothMethods && input.dcfVsRelative > 0.6) {
    reasons.push('The cash-flow and multiples-based valuations differ substantially.');
    score += 1;
  }

  // Estimate is wildly different from the market price
  if (Math.abs(input.upsidePct) > 1.0) {
    reasons.push('The estimated value is more than 100% away from the current price — often a sign of an unusual business (e.g. holding companies, turnarounds, or distorted financials) that this model may not capture well.');
    score += 2;
  } else if (Math.abs(input.upsidePct) > 0.6) {
    score += 1;
  }

  let level: 'high' | 'medium' | 'low' = 'high';
  if (score >= 4) level = 'low';
  else if (score >= 2) level = 'medium';

  return { level, reasons };
}

export interface ValuationOverrides {
  growthRate?: number; // decimal
  discountRate?: number; // decimal (overrides computed WACC)
  terminalGrowthRate?: number; // decimal
  marginOfSafety?: number; // decimal
}

/**
 * Main entry: compute DCF value, relative value, and the averaged intrinsic
 * value for a stock, AlphaSpread-style.
 */
export function calculateValuation(
  fundamentals: any,
  currency: string,
  overrides: ValuationOverrides = {},
): ValuationResult {
  const financialData = fundamentals.financialData || {};
  const keyStats = fundamentals.defaultKeyStatistics || {};
  const summaryDetail = fundamentals.summaryDetail || {};
  const profile = fundamentals.summaryProfile || {};
  const sector = profile.sector || '';

  const region = getRegionParams(currency);
  const terminalGrowth = overrides.terminalGrowthRate ?? region.terminalGrowth;
  const marginOfSafety = overrides.marginOfSafety ?? 0.25;

  const currentPrice = raw(financialData, 'currentPrice')
    ?? raw(summaryDetail, 'previousClose') ?? 0;
  const marketCap = raw(summaryDetail, 'marketCap') ?? 0;
  const shares = raw(keyStats, 'sharesOutstanding')
    ?? (marketCap > 0 && currentPrice > 0 ? marketCap / currentPrice : 0);

  const totalDebt = raw(financialData, 'totalDebt') ?? 0;
  const totalCash = raw(financialData, 'totalCash') ?? 0;
  const netDebt = totalDebt - totalCash;

  // WACC (discount rate for FCF method)
  const waccBreakdown = computeWacc(fundamentals, region, marketCap);
  // Discount rates per method (an explicit override applies to whichever runs)
  const fcfDiscount = overrides.discountRate ?? waccBreakdown.wacc;
  const earningsDiscount = overrides.discountRate ?? waccBreakdown.costOfEquity;

  // Growth
  const initialGrowth = overrides.growthRate ?? estimateGrowthRate(fundamentals);

  // DCF — prefer Free Cash Flow (FCFF) discounted at WACC. For financials and
  // any company without meaningful FCF, fall back to an earnings-based DCF
  // discounted at the cost of equity.
  const baseFcf = getBaseFcf(fundamentals);
  const projectionYears = 10;
  const isFinancial = sector === 'Financial Services';

  let dcfValuePerShare = 0;
  let dcfMethod: 'FCF' | 'Earnings' | 'none' = 'none';
  let dcfBaseCashFlow = baseFcf;
  let effectiveDiscountRate = fcfDiscount;

  if (!isFinancial && baseFcf > 0) {
    dcfValuePerShare = computeDcfPerShare(
      baseFcf, initialGrowth, terminalGrowth, fcfDiscount, netDebt, shares, projectionYears,
    );
    if (dcfValuePerShare > 0) {
      dcfMethod = 'FCF';
      effectiveDiscountRate = fcfDiscount;
    }
  }

  if (dcfValuePerShare <= 0) {
    // Earnings-based fallback (used for banks/financials or missing FCF)
    const baseEarnings = getBaseEarnings(fundamentals, shares);
    const earningsDcf = computeEarningsDcfPerShare(
      baseEarnings, initialGrowth, terminalGrowth, earningsDiscount, shares, projectionYears,
    );
    if (earningsDcf > 0) {
      dcfValuePerShare = earningsDcf;
      dcfMethod = 'Earnings';
      dcfBaseCashFlow = baseEarnings;
      effectiveDiscountRate = earningsDiscount;
    }
  }

  // Revenue-based DCF fallback for high-growth companies with low/negative
  // current earnings or FCF (e.g. Adani Green, early-stage tech). Projects
  // revenue at the growth rate and applies a target mature margin.
  if (dcfValuePerShare <= 0 || (dcfValuePerShare > 0 && dcfValuePerShare < currentPrice * 0.3)) {
    const totalRevenue = raw(financialData, 'totalRevenue') ?? 0;
    const currentMargin = raw(financialData, 'profitMargins') ?? 0;
    if (totalRevenue > 0 && shares > 0) {
      // Target mature net margin: use the higher of current margin or a sector-appropriate floor
      const matureMarginFloor = sector === 'Utilities' ? 0.12 : sector === 'Energy' ? 0.10 : 0.10;
      const targetMargin = Math.max(currentMargin, matureMarginFloor);
      // Apply revenue growth and compute implied future earnings → DCF
      const revenueDcf = computeRevenueDcfPerShare(
        totalRevenue, initialGrowth, terminalGrowth, targetMargin, fcfDiscount, netDebt, shares, projectionYears,
      );
      if (revenueDcf > dcfValuePerShare) {
        dcfValuePerShare = revenueDcf;
        dcfMethod = 'FCF'; // label as cash-flow based (from projected earnings)
        dcfBaseCashFlow = totalRevenue;
        effectiveDiscountRate = fcfDiscount;
      }
    }
  }

  // Relative
  const relative = computeRelativePerShare(fundamentals, sector, shares, netDebt);
  const relativeValuePerShare = relative.value;

  // Intrinsic = average of the two available methods
  const dcfReliable = dcfValuePerShare > 0;
  const relativeReliable = relativeValuePerShare > 0;

  let intrinsicValuePerShare = 0;
  if (dcfReliable && relativeReliable) {
    intrinsicValuePerShare = (dcfValuePerShare + relativeValuePerShare) / 2;
  } else if (dcfReliable) {
    intrinsicValuePerShare = dcfValuePerShare;
  } else if (relativeReliable) {
    intrinsicValuePerShare = relativeValuePerShare;
  }

  const accumulationLevel = intrinsicValuePerShare * (1 - marginOfSafety);
  const exitLevel = intrinsicValuePerShare * 1.3;
  const verdict = getVerdict(currentPrice, intrinsicValuePerShare, accumulationLevel, exitLevel);
  const upsidePct = currentPrice > 0
    ? (intrinsicValuePerShare - currentPrice) / currentPrice
    : 0;

  const confidence = assessConfidence({
    dcfReliable,
    relativeReliable,
    relativeBreakdown: relative.breakdown,
    upsidePct,
    intrinsicValuePerShare,
    bothMethods: dcfReliable && relativeReliable,
    dcfVsRelative: dcfReliable && relativeReliable
      ? Math.abs(dcfValuePerShare - relativeValuePerShare) / Math.max(dcfValuePerShare, relativeValuePerShare)
      : 0,
  });

  const quality = computeQualityScore(fundamentals);

  return {
    dcfValuePerShare,
    relativeValuePerShare,
    intrinsicValuePerShare,
    currentPrice,
    upsidePct,
    wacc: waccBreakdown,
    assumptions: {
      initialGrowthRate: initialGrowth,
      terminalGrowthRate: terminalGrowth,
      projectionYears,
      marginOfSafety,
    },
    relativeBreakdown: relative.breakdown,
    dcfReliable,
    relativeReliable,
    verdict,
    accumulationLevel,
    exitLevel,
    baseFcf: dcfBaseCashFlow,
    dcfMethod,
    effectiveDiscountRate,
    confidence,
    quality,
    sharesOutstanding: shares,
  };
}

export type ScenarioKey = 'bear' | 'base' | 'bull';

export interface ScenarioSet {
  bear: ValuationResult;
  base: ValuationResult;
  bull: ValuationResult;
}

/**
 * Compute Bear / Base / Bull scenarios, AlphaSpread-style.
 * The Base case uses the estimated (or user-overridden) growth rate.
 * Bear assumes materially slower growth; Bull assumes faster growth. We vary
 * the growth assumption only, which flows through both the FCF and
 * earnings-based DCF models and reliably differentiates the scenarios.
 */
export function calculateScenarios(
  fundamentals: any,
  currency: string,
  baseOverrides: ValuationOverrides = {},
): ScenarioSet {
  const region = getRegionParams(currency);

  // Determine the base growth (explicit override wins, else estimate)
  const baseGrowth = baseOverrides.growthRate ?? estimateGrowthRate(fundamentals);

  // Bear: ~60% of base growth (floored just above terminal)
  const bearGrowth = Math.max(region.terminalGrowth + 0.01, baseGrowth * 0.6);
  // Bull: ~140% of base growth (capped)
  const bullGrowth = Math.min(0.4, baseGrowth * 1.4);

  const base = calculateValuation(fundamentals, currency, {
    ...baseOverrides,
    growthRate: baseGrowth,
  });

  const bear = calculateValuation(fundamentals, currency, {
    ...baseOverrides,
    growthRate: bearGrowth,
  });

  const bull = calculateValuation(fundamentals, currency, {
    ...baseOverrides,
    growthRate: bullGrowth,
  });

  return { bear, base, bull };
}
