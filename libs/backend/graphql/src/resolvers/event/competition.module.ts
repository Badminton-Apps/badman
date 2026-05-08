import { AssemblyModule } from "@badman/backend-assembly";
import { CacheModule } from "@badman/backend-cache";
import { DatabaseModule } from "@badman/backend-database";
import { EnrollmentModule } from "@badman/backend-enrollment";
import { NotificationsModule } from "@badman/backend-notifications";
import { QueueModule } from "@badman/backend-queue";
import { RankingModule } from "@badman/backend-ranking";
import { Module } from "@nestjs/common";
import {
  AssemblyResolver,
  CalculateIndexResolver,
  DrawCompetitionResolver,
  EncounterChangeCompetitionResolver,
  EncounterCompetitionResolver,
  EnrollmentEntryService,
  EnrollmentResolver,
  EventCompetitionResolver,
  SubEventCompetitionResolver,
  SubmitEnrollmentResolver,
  SubmitEnrollmentService,
} from "./competition";
import { ChangeEncounterModule } from "@badman/backend-change-encounter";
import { ClubMembershipService } from "../club/club-membership.service";
import { TeamWriteService } from "../team/team-write.service";
import { EnrollmentFinalizeService } from "./enrollment-finalize.service";

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    QueueModule,
    AssemblyModule,
    ChangeEncounterModule,
    EnrollmentModule,
    RankingModule,
    CacheModule,
  ],
  providers: [
    EventCompetitionResolver,
    EncounterCompetitionResolver,
    EncounterChangeCompetitionResolver,
    DrawCompetitionResolver,
    SubEventCompetitionResolver,
    AssemblyResolver,
    EnrollmentResolver,
    EnrollmentEntryService,
    CalculateIndexResolver,
    SubmitEnrollmentResolver,
    SubmitEnrollmentService,
    ClubMembershipService,
    TeamWriteService,
    EnrollmentFinalizeService,
  ],
})
export class CompetitionResolverModule {}
