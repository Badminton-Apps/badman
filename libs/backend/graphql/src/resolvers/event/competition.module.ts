import { AssemblyModule } from "@badman/backend-assembly";
import { CacheModule } from "@badman/backend-cache";
import { DatabaseModule } from "@badman/backend-database";
import { EncounterGamesModule } from "@badman/backend-encounter-games";
import { EnrollmentModule } from "@badman/backend-enrollment";
import { NotificationsModule } from "@badman/backend-notifications";
import { QueueModule } from "@badman/backend-queue";
import { RankingModule } from "@badman/backend-ranking";
import { Module } from "@nestjs/common";
import {
  DrawCompetitionLoaderService,
  EventCompetitionLoaderService,
  SubEventCompetitionLoaderService,
  TeamLoaderService,
} from "../../loaders";
import {
  AssemblyResolver,
  CalculateIndexResolver,
  DrawCompetitionResolver,
  EncounterChangeCompetitionResolver,
  EncounterCompetitionResolver,
  EnrollmentEntryService,
  EnrollmentResolver,
  EventCompetitionResolver,
  SaveEnrollmentRemarksResolver,
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
    EncounterGamesModule,
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
    SaveEnrollmentRemarksResolver,
    ClubMembershipService,
    TeamWriteService,
    EnrollmentFinalizeService,
    TeamLoaderService,
    DrawCompetitionLoaderService,
    EventCompetitionLoaderService,
    SubEventCompetitionLoaderService,
  ],
})
export class CompetitionResolverModule {}
