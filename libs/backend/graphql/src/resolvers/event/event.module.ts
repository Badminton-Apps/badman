import { Module } from "@nestjs/common";
import { CompetitionResolverModule } from "./competition.module";
import { EventEntryResolver, EntryCompetitionPlayersResolver } from "./entry.resolver";
import { EnrollmentFinalizeService } from "./enrollment-finalize.service";
import { EnrollmentValidationCacheService } from "./enrollment-validation-cache.service";
import { TournamentResolverModule } from "./tournament.module";
import { NotificationsModule } from "@badman/backend-notifications";
import { EnrollmentModule } from "@badman/backend-enrollment";

@Module({
  imports: [
    CompetitionResolverModule,
    TournamentResolverModule,
    NotificationsModule,
    EnrollmentModule,
  ],
  providers: [
    EventEntryResolver,
    EntryCompetitionPlayersResolver,
    EnrollmentFinalizeService,
    EnrollmentValidationCacheService,
  ],
  exports: [EnrollmentFinalizeService],
})
export class EventResolverModule {}
