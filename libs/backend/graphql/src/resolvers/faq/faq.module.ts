import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { FaqResolver } from './faq.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [FaqResolver],
})
export class FaqResolverModule {}
