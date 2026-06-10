import { DatabaseModule } from "@badman/backend-database";
import { Module } from "@nestjs/common";
import { EncounterGamesGenerationService } from "./services";

@Module({
  imports: [DatabaseModule],
  providers: [EncounterGamesGenerationService],
  exports: [EncounterGamesGenerationService],
})
export class EncounterGamesModule {}
