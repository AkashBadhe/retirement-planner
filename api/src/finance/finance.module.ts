import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { StockFundamentals, StockFundamentalsSchema } from './schemas/stock-fundamentals.schema';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
    }),
    MongooseModule.forFeature([
      { name: StockFundamentals.name, schema: StockFundamentalsSchema },
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
