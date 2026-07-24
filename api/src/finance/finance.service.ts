import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { StockFundamentals } from './schemas/stock-fundamentals.schema';

const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';
const YAHOO_QUOTE_SUMMARY_URL = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary/';
const YAHOO_TIMESERIES_URL = 'https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/';

// How long cached fundamentals stay fresh (12 hours)
const FUNDAMENTALS_TTL_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class FinanceService {
  private crumb: string | null = null;
  private cookie: string | null = null;
  private crumbExpiry = 0;

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(StockFundamentals.name)
    private readonly fundamentalsCache: Model<StockFundamentals>,
  ) {}

  /**
   * Fetches a valid crumb + cookie pair from Yahoo Finance.
   * Yahoo requires this for authenticated endpoints like quoteSummary.
   */
  private async refreshCrumb(): Promise<void> {
    // Only refresh if expired (cache for 5 minutes)
    if (this.crumb && this.cookie && Date.now() < this.crumbExpiry) {
      return;
    }

    try {
      // Step 1: Get consent cookie by visiting the main page
      const consentRes = await firstValueFrom(
        this.httpService.get('https://fc.yahoo.com', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          validateStatus: () => true, // accept any status
        }),
      );

      // Extract set-cookie headers
      const setCookies: string[] = consentRes.headers['set-cookie'] || [];
      const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');

      // Step 2: Fetch the crumb using the cookie
      const crumbRes = await firstValueFrom(
        this.httpService.get('https://query2.finance.yahoo.com/v1/test/getcrumb', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Cookie: cookieStr,
          },
          responseType: 'text',
        }),
      );

      this.crumb = crumbRes.data;
      this.cookie = cookieStr;
      this.crumbExpiry = Date.now() + 5 * 60 * 1000; // 5 min cache
    } catch {
      // If crumb fetch fails, reset and let the request try without it
      this.crumb = null;
      this.cookie = null;
    }
  }

  async getHistoricalData(
    symbol: string,
    period1: number,
    period2: number,
    interval: string = '1d',
  ) {
    try {
      const url = `${YAHOO_CHART_URL}${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=${interval}&events=history`;

      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }),
      );

      if (data.chart?.error) {
        throw new HttpException(
          data.chart.error.description || 'Symbol not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return data;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;

      const status = error.response?.status || HttpStatus.BAD_GATEWAY;
      const message =
        error.response?.data?.chart?.error?.description ||
        'Failed to fetch data from Yahoo Finance';

      throw new HttpException(message, status);
    }
  }

  async searchSymbols(query: string) {
    try {
      const url = `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0`;

      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }),
      );

      const quotes = data.quotes || [];

      return quotes
        .filter(
          (q: any) =>
            q.quoteType === 'EQUITY' ||
            q.quoteType === 'ETF' ||
            q.quoteType === 'INDEX' ||
            q.quoteType === 'CRYPTOCURRENCY' ||
            q.quoteType === 'MUTUALFUND' ||
            q.quoteType === 'FUTURE' ||
            q.quoteType === 'COMMODITY',
        )
        .map((q: any) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          exchange: q.exchange || '',
          type: q.quoteType || '',
        }));
    } catch (error: any) {
      throw new HttpException(
        'Failed to search symbols',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getExchangeRate(from: string, to: string) {
    try {
      // Use the free exchangerate-api (no key needed)
      const url = `https://open.er-api.com/v6/latest/${from.toUpperCase()}`;

      const { data } = await firstValueFrom(
        this.httpService.get(url),
      );

      const rate = data.rates?.[to.toUpperCase()];
      if (!rate) {
        throw new HttpException(
          `Exchange rate not found for ${from} to ${to}`,
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate,
        timestamp: data.time_last_update_unix,
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to fetch exchange rate',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Returns stock fundamentals, served from the MongoDB cache when fresh.
   * Falls back to a Yahoo fetch (and refreshes the cache) when stale or forced.
   * If Yahoo fails but a stale cache exists, the stale copy is returned.
   */
  async getStockFundamentals(symbol: string, force = false) {
    const sym = symbol.trim().toUpperCase();

    // 1. Try the cache
    let cached: StockFundamentals | null = null;
    try {
      cached = await this.fundamentalsCache.findOne({ symbol: sym }).lean().exec() as any;
    } catch {
      // DB unavailable — proceed to live fetch
    }

    const isFresh = cached?.fetchedAt &&
      Date.now() - new Date(cached.fetchedAt).getTime() < FUNDAMENTALS_TTL_MS;

    if (cached && isFresh && !force) {
      return cached.data;
    }

    // 2. Fetch fresh from Yahoo
    try {
      const result = await this.fetchFundamentalsFromYahoo(sym);

      // 3. Update the cache (best-effort)
      try {
        await this.fundamentalsCache
          .findOneAndUpdate(
            { symbol: sym },
            { $set: { symbol: sym, data: result, fetchedAt: new Date() } },
            { upsert: true },
          )
          .exec();
      } catch {
        // ignore cache write failures
      }

      return result;
    } catch (error) {
      // 4. On failure, fall back to a stale cache if we have one
      if (cached?.data) {
        return cached.data;
      }
      throw error;
    }
  }

  /** Low-level Yahoo quoteSummary fetch (no caching). */
  private async fetchFundamentalsFromYahoo(symbol: string) {
    try {
      await this.refreshCrumb();

      const modules = [
        'defaultKeyStatistics',
        'financialData',
        'summaryDetail',
        'earnings',
        'earningsTrend',
        'incomeStatementHistory',
        'balanceSheetHistory',
        'cashflowStatementHistory',
        'summaryProfile',
      ].join(',');

      let url = `${YAHOO_QUOTE_SUMMARY_URL}${encodeURIComponent(symbol)}?modules=${modules}`;
      if (this.crumb) {
        url += `&crumb=${encodeURIComponent(this.crumb)}`;
      }

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };
      if (this.cookie) {
        headers['Cookie'] = this.cookie;
      }

      const { data } = await firstValueFrom(
        this.httpService.get(url, { headers }),
      );

      if (data.quoteSummary?.error) {
        throw new HttpException(
          data.quoteSummary.error.description || 'Symbol not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const result = data.quoteSummary?.result?.[0];
      if (!result) {
        throw new HttpException('No fundamental data available', HttpStatus.NOT_FOUND);
      }

      return result;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;

      // If we got a 401, invalidate crumb and retry once
      if (error.response?.status === 401) {
        this.crumb = null;
        this.cookie = null;
        this.crumbExpiry = 0;
      }

      const status = error.response?.status || HttpStatus.BAD_GATEWAY;
      const message =
        error.response?.data?.quoteSummary?.error?.description ||
        'Failed to fetch fundamental data from Yahoo Finance';

      throw new HttpException(message, status);
    }
  }

  /**
   * Batch fundamentals for many symbols — used by the watchlist so the whole
   * list loads in a single request. Returns a map of symbol -> data|null.
   * Cache-first per symbol; failures return null rather than aborting the batch.
   */
  async getFundamentalsBatch(symbols: string[], force = false) {
    const unique = Array.from(new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean)));
    const out: Record<string, any> = {};

    // Fetch sequentially to be gentle on Yahoo (cache hits are instant anyway)
    for (const sym of unique) {
      try {
        out[sym] = await this.getStockFundamentals(sym, force);
      } catch {
        out[sym] = null;
      }
    }
    return out;
  }

  /**
   * Fetches annual historical fundamentals (revenue, net income, EPS, margins,
   * ROE, FCF, debt, dividends) from Yahoo's fundamentals time-series API and
   * returns a normalized, charting-friendly payload.
   */
  async getFundamentalsHistory(symbol: string, years: string = '5') {
    try {
      await this.refreshCrumb();

      const now = Math.floor(Date.now() / 1000);
      const lookbackYears = years === 'max' ? 15 : years === '10' ? 11 : 6;
      const period1 = now - lookbackYears * 365 * 24 * 60 * 60;

      const types = [
        'annualTotalRevenue',
        'annualNetIncome',
        'annualDilutedEPS',
        'annualBasicEPS',
        'annualGrossProfit',
        'annualOperatingIncome',
        'annualStockholdersEquity',
        'annualFreeCashFlow',
        'annualTotalDebt',
        'annualCashDividendsPaid',
      ];

      const url =
        `${YAHOO_TIMESERIES_URL}${encodeURIComponent(symbol)}` +
        `?type=${types.join(',')}&period1=${period1}&period2=${now}` +
        (this.crumb ? `&crumb=${encodeURIComponent(this.crumb)}` : '');

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };
      if (this.cookie) headers['Cookie'] = this.cookie;

      const { data } = await firstValueFrom(this.httpService.get(url, { headers }));

      const results: any[] = data?.timeseries?.result || [];
      return this.normalizeTimeseries(symbol, results);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;

      if (error.response?.status === 401) {
        this.crumb = null;
        this.cookie = null;
        this.crumbExpiry = 0;
      }

      const status = error.response?.status || HttpStatus.BAD_GATEWAY;
      throw new HttpException(
        'Failed to fetch historical fundamentals from Yahoo Finance',
        status,
      );
    }
  }

  /**
   * Converts Yahoo's time-series result array into per-metric year/value
   * arrays, deriving margins and ROE. Tolerant of missing series.
   */
  private normalizeTimeseries(symbol: string, results: any[]) {
    // Map: yahoo type key -> [{ year, value }]
    const rawSeries: Record<string, { year: number; value: number }[]> = {};

    for (const block of results) {
      // Each block has keys like "annualTotalRevenue" alongside "timestamp"/"meta"
      const typeKey = Object.keys(block).find(
        k => k !== 'timestamp' && k !== 'meta' && Array.isArray(block[k]),
      );
      if (!typeKey) continue;

      const points: { year: number; value: number }[] = [];
      for (const entry of block[typeKey]) {
        if (!entry || entry.reportedValue == null) continue;
        const dateStr: string = entry.asOfDate || '';
        const year = parseInt(dateStr.slice(0, 4), 10);
        const value = Number(entry.reportedValue.raw);
        if (!isNaN(year) && !isNaN(value)) {
          points.push({ year, value });
        }
      }
      if (points.length > 0) {
        points.sort((a, b) => a.year - b.year);
        rawSeries[typeKey] = points;
      }
    }

    const get = (key: string) => rawSeries[key];

    // Helper to align two series by year and compute a derived value
    const derive = (
      aKey: string,
      bKey: string,
      fn: (a: number, b: number) => number,
    ): { year: number; value: number }[] => {
      const a = get(aKey);
      const b = get(bKey);
      if (!a || !b) return [];
      const bByYear = new Map(b.map(p => [p.year, p.value]));
      const out: { year: number; value: number }[] = [];
      for (const p of a) {
        const bv = bByYear.get(p.year);
        if (bv != null && bv !== 0) {
          out.push({ year: p.year, value: fn(p.value, bv) });
        }
      }
      return out;
    };

    const revenue = get('annualTotalRevenue') || [];
    const netIncome = get('annualNetIncome') || [];
    const eps = get('annualDilutedEPS') || get('annualBasicEPS') || [];
    const grossProfit = get('annualGrossProfit');
    const operatingIncome = get('annualOperatingIncome');
    const equity = get('annualStockholdersEquity');
    const fcf = get('annualFreeCashFlow') || [];
    const totalDebt = get('annualTotalDebt') || [];
    const dividendsPaid = get('annualCashDividendsPaid');

    // Margins (percent)
    const grossMargin = grossProfit ? derive('annualGrossProfit', 'annualTotalRevenue', (g, r) => (g / r) * 100) : [];
    const operatingMargin = operatingIncome ? derive('annualOperatingIncome', 'annualTotalRevenue', (o, r) => (o / r) * 100) : [];
    const netMargin = derive('annualNetIncome', 'annualTotalRevenue', (n, r) => (n / r) * 100);
    const roe = equity ? derive('annualNetIncome', 'annualStockholdersEquity', (n, e) => (n / e) * 100) : [];

    // Dividend paid is negative (cash outflow); flip sign for display
    const dividends = (dividendsPaid || []).map(p => ({ year: p.year, value: Math.abs(p.value) }));

    const allYears = new Set<number>();
    [revenue, netIncome, eps, fcf, totalDebt].forEach(s => s.forEach(p => allYears.add(p.year)));
    const fiscalYears = Array.from(allYears).sort((a, b) => a - b);

    const series: Record<string, { year: number; value: number }[]> = {};
    const put = (k: string, v: { year: number; value: number }[]) => {
      if (v && v.length > 0) series[k] = v;
    };
    put('revenue', revenue);
    put('netIncome', netIncome);
    put('eps', eps);
    put('grossMargin', grossMargin);
    put('operatingMargin', operatingMargin);
    put('netMargin', netMargin);
    put('roe', roe);
    put('freeCashFlow', fcf);
    put('totalDebt', totalDebt);
    put('dividendPerShare', dividends);

    return {
      symbol,
      fiscalYears,
      series,
      coverage: {
        from: fiscalYears[0] ?? null,
        to: fiscalYears[fiscalYears.length - 1] ?? null,
        availableYears: fiscalYears.length,
      },
    };
  }
}
