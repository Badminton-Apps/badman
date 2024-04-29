import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import {
  GamePlayersResolver,
  PlayerClubResolver,
  PlayersResolver,
  PlayerTeamResolver,
} from './player.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [PlayersResolver, PlayerClubResolver, GamePlayersResolver, PlayerTeamResolver],
})
export class PlayerResolverModule {}
