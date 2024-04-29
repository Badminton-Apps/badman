import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { ClubPlayerResolver, ClubsResolver } from './club.resolver';
import { ClubPlayerMembershipsResolver } from './club-membership.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [ClubsResolver, ClubPlayerResolver, ClubPlayerMembershipsResolver],
})
export class ClubResolverModule {}
