import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import { ClubPlayerResolver, ClubsResolver } from './club.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [ClubsResolver, ClubPlayerResolver],
})
export class ClubModule {}
