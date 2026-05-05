import { DatabaseModule } from "@badman/backend-database";
import { Module } from "@nestjs/common";
import { TeamRenumberResolver } from "./team-renumber.resolver";
import { TeamRenumberingService } from "./team-renumbering.service";
import { TeamPlayerResolver, TeamsResolver } from "./team.resolver";

@Module({
  imports: [DatabaseModule],
  providers: [TeamsResolver, TeamPlayerResolver, TeamRenumberResolver, TeamRenumberingService],
})
export class TeamResolverModule {}
