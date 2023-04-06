import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { GamesResolver } from './game.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [GamesResolver],
})
export class GameResolverModule {}
