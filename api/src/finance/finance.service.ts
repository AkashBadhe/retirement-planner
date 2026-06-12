import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';

@Injectable()
export class FinanceService {
  constructor(private readonly httpService: HttpService) {}

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
          (q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF',
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
}
