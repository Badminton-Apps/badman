import { DatabaseModule } from "@badman/backend-database";
import { EnrollmentModule } from "@badman/backend-enrollment";
import { Module } from "@nestjs/common";
import { TeamPlayerResolver, TeamsResolver } from "./team.resolver";
import { TeamWriteService } from "./team-write.service";

@Module({
  imports: [DatabaseModule, EnrollmentModule],
  providers: [TeamsResolver, TeamPlayerResolver, TeamWriteService],
  exports: [TeamWriteService],
})
export class TeamResolverModule {}
