import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * A per-user or per-client watchlist.
 * - Authenticated users: keyed by `userId` (their MongoDB User._id).
 * - Anonymous users: keyed by `clientId` (a browser-generated UUID).
 * At most one of these will be set per document.
 */
@Schema({ timestamps: true })
export class Watchlist extends Document {
  @Prop({ index: true, sparse: true })
  clientId?: string;

  @Prop({ index: true, sparse: true })
  userId?: string;

  @Prop({ type: [String], default: [] })
  symbols: string[];
}

export const WatchlistSchema = SchemaFactory.createForClass(Watchlist);

// Compound index for lookups
WatchlistSchema.index({ clientId: 1 }, { sparse: true, unique: true });
WatchlistSchema.index({ userId: 1 }, { sparse: true, unique: true });
