import { DatabaseModule } from '@badman/backend/database';
import { Module } from '@nestjs/common';
import { ClubPlayerResolver, ClubsResolver } from './club.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [ClubsResolver, ClubPlayerResolver],
})
export class ClubModule {}
