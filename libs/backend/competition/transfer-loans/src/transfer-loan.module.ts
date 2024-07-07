import { Module } from '@nestjs/common';
import { TransferLoanController } from './controllers/transfer-loan.controller';
import { LoansService } from './services/loans.service.ts';
import { TransferService } from './services/transfers.service';

@Module({
  controllers: [TransferLoanController],
  providers: [TransferService, LoansService],
  exports: [],
})
export class TransferLoanModule {}
