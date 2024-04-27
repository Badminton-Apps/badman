import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import {
  GamePlayersResolver,
  PlayerClubResolver,
  PlayersResolver,
  TeamPlayerResolver,
} from './player.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [PlayersResolver, PlayerClubResolver, GamePlayersResolver, TeamPlayerResolver],
})
export class PlayerResolverModule {}
