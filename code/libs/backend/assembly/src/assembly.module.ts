import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { AssemblyValidationService } from './services';

@Module({
  imports: [DatabaseModule],
  providers: [AssemblyValidationService],
  exports: [AssemblyValidationService],
})
export class AssemblyModule {}
