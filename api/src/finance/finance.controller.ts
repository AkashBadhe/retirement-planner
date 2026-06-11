import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { FinanceService } from './finance.service';

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
}
