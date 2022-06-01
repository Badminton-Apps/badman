import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import { ClubsResolver } from './club.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [ClubsResolver],
})
export class ClubModule {}
