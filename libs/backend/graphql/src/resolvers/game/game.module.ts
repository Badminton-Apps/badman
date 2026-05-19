import { DatabaseModule } from "@badman/backend-database";
import { Module } from "@nestjs/common";
import { GamesResolver } from "./game.resolver";
import { QueueModule } from "@badman/backend-queue";
import { RankingModule } from "@badman/backend-ranking";

@Module({
  imports: [DatabaseModule, QueueModule, RankingModule],
  providers: [GamesResolver],
})
export class GameResolverModule {}
