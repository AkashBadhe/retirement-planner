import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Cache of Yahoo Finance quoteSummary fundamentals per symbol.
 * Avoids hammering Yahoo on every watchlist / analysis load. Refreshed on a
 * TTL or on demand (refresh button).
 */
@Schema({ timestamps: true })
export class StockFundamentals extends Document {
  @Prop({ required: true, unique: true, index: true })
  symbol: string;

  @Prop({ type: Object })
  data: any;

  @Prop({ default: Date.now })
  fetchedAt: Date;
}

export const StockFundamentalsSchema = SchemaFactory.createForClass(StockFundamentals);
