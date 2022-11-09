import { Module } from '@nestjs/common';
import { PdfService } from './services';
import { HandlebarModule } from '@badman/backend-handlebar';
import { AssemblyModule } from '@badman/backend-assembly';

@Module({
  controllers: [],
  imports: [
    HandlebarModule,
    AssemblyModule
  ],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
