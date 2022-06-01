import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import { LastRankingPlaceResolver } from './lastRankingPlace.resolver';
import { RankingPlaceResolver } from './rankingPlace.resolver';
import { RankingPointResolver } from './rankingPoint.resolver';
import { RankingSystemResolver } from './rankingSystem.resolver';
import { RankingSystemGroupResolver } from './rankingSystemGroup.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [
    RankingSystemResolver,
    RankingSystemGroupResolver,
    RankingPointResolver,
    RankingPlaceResolver,
    LastRankingPlaceResolver,
  ],
})
export class RankingModule {}
