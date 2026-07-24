import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Watchlist } from './schemas/watchlist.schema';

function normalize(symbols: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of symbols || []) {
    const u = String(s).trim().toUpperCase();
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

type Key = { clientId: string } | { userId: string };

@Injectable()
export class WatchlistService {
  constructor(
    @InjectModel(Watchlist.name) private readonly watchlistModel: Model<Watchlist>,
  ) {}

  async getSymbols(key: Key): Promise<string[]> {
    const doc = await this.watchlistModel.findOne(key).lean().exec();
    return doc?.symbols ?? [];
  }

  async replaceSymbols(key: Key, symbols: string[]): Promise<string[]> {
    const normalized = normalize(symbols);
    const doc = await this.watchlistModel
      .findOneAndUpdate(key, { $set: { symbols: normalized, ...key } }, { new: true, upsert: true })
      .lean()
      .exec();
    return doc?.symbols ?? normalized;
  }

  async addSymbol(key: Key, symbol: string): Promise<string[]> {
    const current = await this.getSymbols(key);
    return this.replaceSymbols(key, [...current, symbol]);
  }

  async removeSymbol(key: Key, symbol: string): Promise<string[]> {
    const current = await this.getSymbols(key);
    const target = symbol.trim().toUpperCase();
    return this.replaceSymbols(key, current.filter(s => s !== target));
  }

  /**
   * Migrate an anonymous watchlist to an authenticated user. If the user
   * already has a list, merge symbols (the user's list wins on duplicates).
   */
  async migrateToUser(clientId: string, userId: string): Promise<string[]> {
    const anonSymbols = await this.getSymbols({ clientId });
    const userSymbols = await this.getSymbols({ userId });
    const merged = normalize([...userSymbols, ...anonSymbols]);

    // Save under the user key
    await this.replaceSymbols({ userId }, merged);

    // Delete the anonymous document
    await this.watchlistModel.deleteOne({ clientId }).exec();

    return merged;
  }
}
