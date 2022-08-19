import { DatabaseModule } from '@badman/backend/database';
import { RankingModule } from '@badman/backend/ranking';
import { Module } from '@nestjs/common';
import { LastRankingPlaceResolver } from './lastRankingPlace.resolver';
import { RankingPlaceResolver } from './rankingPlace.resolver';
import { RankingPointResolver } from './rankingPoint.resolver';
import { RankingSystemResolver } from './rankingSystem.resolver';
import { RankingGroupsResolver } from './rankingSystemGroup.resolver';

@Module({
  imports: [DatabaseModule, RankingModule],
  providers: [
    RankingSystemResolver,
    RankingGroupsResolver,
    RankingPointResolver,
    RankingPlaceResolver,
    LastRankingPlaceResolver,
  ],
})
export class RankingResolverModule {}
