import { DatabaseModule } from '@badman/backend/database';
import { Module } from '@nestjs/common';
import { TeamsResolver } from './team.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [TeamsResolver],
})
export class TeamResolverModule {}
