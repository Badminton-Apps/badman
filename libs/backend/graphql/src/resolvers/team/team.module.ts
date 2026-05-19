import { DatabaseModule } from "@badman/backend-database";
import { EnrollmentModule } from "@badman/backend-enrollment";
import { Module } from "@nestjs/common";
import { TeamAssociationService } from "./team-association.service";
import { TeamPlayerResolver, TeamsResolver } from "./team.resolver";
import { TeamWriteService } from "./team-write.service";

@Module({
  imports: [DatabaseModule, EnrollmentModule],
  providers: [TeamsResolver, TeamPlayerResolver, TeamWriteService, TeamAssociationService],
  exports: [TeamWriteService],
})
export class TeamResolverModule {}
