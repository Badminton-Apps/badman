import { DatabaseModule } from '@badman/api/database';
import { Module } from '@nestjs/common';
import { PlayersResolver } from './player.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [PlayersResolver],
})
export class PlayerModule {}
