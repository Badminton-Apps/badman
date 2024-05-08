import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { TeamPlayerResolver, TeamsResolver } from './team.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [TeamsResolver, TeamPlayerResolver],
})
export class TeamResolverModule {}
