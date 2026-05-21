import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CompetitionResolverModule } from "./competition.module";
import { EventEntryResolver, EntryCompetitionPlayersResolver } from "./entry.resolver";
import { EnrollmentFinalizeService } from "./enrollment-finalize.service";
import { EnrollmentValidationCacheService } from "./enrollment-validation-cache.service";
import { TournamentResolverModule } from "./tournament.module";
import { NotificationsModule } from "@badman/backend-notifications";
import { EnrollmentModule } from "@badman/backend-enrollment";
import { SubEventCompetitionLoaderService } from "../../loaders";

@Module({
  imports: [
    ConfigModule,
    CompetitionResolverModule,
    TournamentResolverModule,
    NotificationsModule,
    EnrollmentModule,
  ],
  providers: [
    EventEntryResolver,
    EntryCompetitionPlayersResolver,
    EnrollmentFinalizeService,
    SubEventCompetitionLoaderService,
    EnrollmentValidationCacheService,
  ],
  exports: [EnrollmentFinalizeService],
})
export class EventResolverModule {}
