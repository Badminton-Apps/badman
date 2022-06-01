import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import { GamesResolver } from './game.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [GamesResolver],
})
export class GameModule {}
