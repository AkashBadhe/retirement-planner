import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
    }),
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
