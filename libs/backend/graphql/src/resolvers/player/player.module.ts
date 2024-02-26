import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { GamePlayersResolver, PlayersResolver, TeamPlayerResolver } from './player.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [PlayersResolver, GamePlayersResolver, TeamPlayerResolver],
})
export class PlayerResolverModule {}
