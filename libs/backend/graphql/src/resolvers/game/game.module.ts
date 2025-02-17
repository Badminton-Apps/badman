import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { GamesResolver } from './game.resolver';
import { QueueModule } from '@badman/backend-queue';

@Module({
  imports: [DatabaseModule, QueueModule],
  providers: [GamesResolver],
})
export class GameResolverModule {}
