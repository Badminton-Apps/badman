import { Module } from '@nestjs/common';
import { PdfService } from './services';
import { HandlebarModule } from '@badman/backend-handlebar';

@Module({
  controllers: [],
  imports: [
    HandlebarModule,
  ],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
