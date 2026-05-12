import { DatabaseModule } from "@badman/backend-database";
import { Module } from "@nestjs/common";
import { ClubPlayerResolver, ClubsResolver } from "./club.resolver";
import { ClubMembershipService } from "./club-membership.service";
import { ClubPlayerMembershipsResolver } from "./club-membership.resolver";

@Module({
  imports: [DatabaseModule],
  providers: [
    ClubsResolver,
    ClubPlayerResolver,
    ClubPlayerMembershipsResolver,
    ClubMembershipService,
  ],
  exports: [ClubMembershipService],
})
export class ClubResolverModule {}
