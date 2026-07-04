// Calculation utilities for the Historical Fundamentals Dashboard.
// Pure functions, guarded against bad inputs (no NaN/Infinity leaking to UI).

import { YearValue } from './yahooFinance';

export interface HistoricalPricePoint {
  date: Date;
  close: number;
}

/**
 * Compound Annual Growth Rate between the first and last data points.
 * Returns null when it can't be computed reliably (non-positive base,
 * <2 points, or a sign change that makes CAGR meaningless).
 */
export function cagr(series: YearValue[]): number | null {
  if (!series || series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const years = last.year - first.year;
  if (years <= 0) return null;
  if (first.value <= 0 || last.value <= 0) return null;
  return (Math.pow(last.value / first.value, 1 / years) - 1) * 100;
}

/** Change in a ratio series over the window (last − first), in the series' units. */
export function changeOverWindow(series: YearValue[]): number | null {
  if (!series || series.length < 2) return null;
  return series[series.length - 1].value - series[0].value;
}

/** Average value of a series (e.g. average ROE). */
export function average(series: YearValue[]): number | null {
  if (!series || series.length === 0) return null;
  return series.reduce((s, p) => s + p.value, 0) / series.length;
}

/** Slice a year/value series to the trailing N fiscal years (lossless). */
export function sliceYears(series: YearValue[] | undefined, years: number): YearValue[] {
  if (!series || series.length === 0) return [];
  if (series.length <= years) return series;
  return series.slice(series.length - years);
}

/**
 * Estimate historical P/E for each fiscal year: the year-end market price
 * divided by that year's EPS. Treated as an estimate. Years with non-positive
 * EPS are skipped (P/E is not meaningful for losses).
 */
export function computeHistoricalPE(
  prices: HistoricalPricePoint[],
  epsSeries: YearValue[] | undefined,
): YearValue[] {
  if (!prices || prices.length === 0 || !epsSeries || epsSeries.length === 0) return [];

  const out: YearValue[] = [];
  for (const eps of epsSeries) {
    if (eps.value <= 0) continue;
    const yearEnd = new Date(eps.year, 11, 31).getTime();
    // Find the price closest to (and not after, where possible) the fiscal year end
    let best: HistoricalPricePoint | null = null;
    let bestDiff = Infinity;
    for (const p of prices) {
      const diff = Math.abs(p.date.getTime() - yearEnd);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = p;
      }
    }
    // Only use if within ~6 months of the year end
    if (best && bestDiff <= 1000 * 60 * 60 * 24 * 183) {
      out.push({ year: eps.year, value: best.close / eps.value });
    }
  }
  return out;
}

/** PEG = trailing P/E / EPS growth%. Only meaningful when growth > 0. */
export function computePEG(peSeries: YearValue[], epsCagrPct: number | null): YearValue[] {
  if (!peSeries || peSeries.length === 0 || epsCagrPct == null || epsCagrPct <= 0) return [];
  return peSeries.map(p => ({ year: p.year, value: p.value / epsCagrPct }));
}
