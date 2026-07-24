import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Query,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { WatchlistService } from './watchlist.service';

interface ReplaceBody {
  clientId?: string;
  userId?: string;
  symbols: string[];
}

interface SymbolBody {
  clientId?: string;
  userId?: string;
  symbol: string;
}

function resolveKey(clientId?: string, userId?: string) {
  if (userId) return { userId };
  if (clientId) return { clientId };
  return null;
}

@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  /** GET /api/watchlist?clientId=... or ?userId=... */
  @Get()
  async get(@Query('clientId') clientId?: string, @Query('userId') userId?: string) {
    const key = resolveKey(clientId, userId);
    if (!key) throw new HttpException('clientId or userId is required', HttpStatus.BAD_REQUEST);
    const symbols = await this.watchlistService.getSymbols(key);
    return { ...key, symbols };
  }

  /** PUT /api/watchlist  { clientId|userId, symbols } — replace whole list */
  @Put()
  async replace(@Body() body: ReplaceBody) {
    const key = resolveKey(body?.clientId, body?.userId);
    if (!key) throw new HttpException('clientId or userId is required', HttpStatus.BAD_REQUEST);
    const symbols = await this.watchlistService.replaceSymbols(key, Array.isArray(body.symbols) ? body.symbols : []);
    return { ...key, symbols };
  }

  /** POST /api/watchlist/add  { clientId|userId, symbol } */
  @Post('add')
  async add(@Body() body: SymbolBody) {
    const key = resolveKey(body?.clientId, body?.userId);
    if (!key || !body?.symbol) throw new HttpException('clientId/userId and symbol required', HttpStatus.BAD_REQUEST);
    const symbols = await this.watchlistService.addSymbol(key, body.symbol);
    return { ...key, symbols };
  }

  /** DELETE /api/watchlist?clientId=...&symbol=... or ?userId=...&symbol=... */
  @Delete()
  async remove(
    @Query('clientId') clientId?: string,
    @Query('userId') userId?: string,
    @Query('symbol') symbol?: string,
  ) {
    const key = resolveKey(clientId, userId);
    if (!key || !symbol) throw new HttpException('clientId/userId and symbol required', HttpStatus.BAD_REQUEST);
    const symbols = await this.watchlistService.removeSymbol(key, symbol);
    return { ...key, symbols };
  }

  /** POST /api/watchlist/migrate  { clientId, userId } — merge anon list into user */
  @Post('migrate')
  async migrate(@Body() body: { clientId?: string; userId?: string }) {
    if (!body?.clientId || !body?.userId) {
      throw new HttpException('Both clientId and userId are required', HttpStatus.BAD_REQUEST);
    }
    const symbols = await this.watchlistService.migrateToUser(body.clientId, body.userId);
    return { userId: body.userId, symbols };
  }
}
