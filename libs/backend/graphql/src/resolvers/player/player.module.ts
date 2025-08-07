import { DatabaseModule } from "@badman/backend-database";
import { Module } from "@nestjs/common";
import {
  GamePlayersResolver,
  PlayerClubResolver,
  PlayersResolver,
  PlayerTeamResolver,
} from "./player.resolver";
import { RankingModule } from "@badman/backend-ranking";

@Module({
  imports: [DatabaseModule, RankingModule],
  providers: [PlayersResolver, PlayerClubResolver, GamePlayersResolver, PlayerTeamResolver],
})
export class PlayerResolverModule {}
