import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ErrorLogDocument = ErrorLog & Document;

@Schema({ timestamps: true })
export class ErrorLog {
  @Prop({ required: true })
  level: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  stack?: string;

  @Prop()
  status?: number;

  @Prop()
  method?: string;

  @Prop()
  url?: string;

  @Prop({ type: Object })
  meta?: Record<string, any>;
}

export const ErrorLogSchema = SchemaFactory.createForClass(ErrorLog);