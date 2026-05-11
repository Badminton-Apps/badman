import { DatabaseModule } from "@badman/backend-database";
import { EnrollmentModule } from "@badman/backend-enrollment";
import { Module } from "@nestjs/common";
import { TeamRenumberResolver } from "./team-renumber.resolver";
import { TeamRenumberingService } from "./team-renumbering.service";
import { TeamPlayerResolver, TeamsResolver } from "./team.resolver";
import { TeamWriteService } from "./team-write.service";

@Module({
  imports: [DatabaseModule, EnrollmentModule],
  providers: [
    TeamsResolver,
    TeamPlayerResolver,
    TeamWriteService,
    TeamRenumberResolver,
    TeamRenumberingService,
  ],
  exports: [TeamWriteService],
})
export class TeamResolverModule {}
