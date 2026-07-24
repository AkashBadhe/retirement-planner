import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { Public } from '../common/decorators/public.decorator';

@Public()
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  /**
   * GET /api/finance/chart?symbol=NIFTYBEES.NS&period1=1577836800&period2=1718064000&interval=1d
   * Proxies Yahoo Finance chart API for historical price data
   */
  @Get('chart')
  async getChart(
    @Query('symbol') symbol: string,
    @Query('period1') period1: string,
    @Query('period2') period2: string,
    @Query('interval') interval: string = '1d',
  ) {
    if (!symbol || !period1 || !period2) {
      throw new HttpException(
        'symbol, period1, and period2 are required query parameters',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.financeService.getHistoricalData(
      symbol,
      parseInt(period1, 10),
      parseInt(period2, 10),
      interval,
    );
  }

  /**
   * GET /api/finance/search?q=infosys
   * Proxies Yahoo Finance search API for symbol autocomplete
   */
  @Get('search')
  async searchSymbols(@Query('q') query: string) {
    if (!query || query.length < 1) {
      throw new HttpException(
        'q query parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.financeService.searchSymbols(query);
  }

  /**
   * GET /api/finance/exchange-rate?from=USD&to=INR
   * Returns current exchange rate
   */
  @Get('exchange-rate')
  async getExchangeRate(
    @Query('from') from: string = 'USD',
    @Query('to') to: string = 'INR',
  ) {
    return this.financeService.getExchangeRate(from, to);
  }

  /**
   * GET /api/finance/fundamentals?symbol=INFY.NS&force=false
   * Returns stock fundamental data (P/E, EPS, revenue, etc.), cached in DB.
   */
  @Get('fundamentals')
  async getFundamentals(
    @Query('symbol') symbol: string,
    @Query('force') force?: string,
  ) {
    if (!symbol) {
      throw new HttpException(
        'symbol query parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.financeService.getStockFundamentals(symbol, force === 'true');
  }

  /**
   * GET /api/finance/fundamentals-batch?symbols=INFY.NS,TCS.NS&force=false
   * Returns cached fundamentals for many symbols in one request (watchlist).
   */
  @Get('fundamentals-batch')
  async getFundamentalsBatch(
    @Query('symbols') symbols: string,
    @Query('force') force?: string,
  ) {
    if (!symbols) {
      throw new HttpException(
        'symbols query parameter is required (comma-separated)',
        HttpStatus.BAD_REQUEST,
      );
    }
    const list = symbols.split(',').map(s => s.trim()).filter(Boolean);
    return this.financeService.getFundamentalsBatch(list, force === 'true');
  }

  /**
   * GET /api/finance/fundamentals-history?symbol=INFY.NS&years=5
   * Returns annual historical fundamentals (revenue, margins, ROE, etc.)
   */
  @Get('fundamentals-history')
  async getFundamentalsHistory(
    @Query('symbol') symbol: string,
    @Query('years') years: string = '5',
  ) {
    if (!symbol) {
      throw new HttpException(
        'symbol query parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const allowed = ['5', '10', 'max'];
    const yrs = allowed.includes(years) ? years : '5';
    return this.financeService.getFundamentalsHistory(symbol, yrs);
  }
}
